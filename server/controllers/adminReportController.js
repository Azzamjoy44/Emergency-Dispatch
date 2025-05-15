const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Generate a statistical report based on the report parameters
 */
exports.generateReport = async (req, res) => {
  // Only admins can generate reports
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { startDate, endDate, reportType, emergencyType } = req.body;

  if (!startDate || !endDate || !reportType) {
    return res.status(400).json({ error: 'startDate, endDate, and reportType are required' });
  }

  try {
    // Convert date strings to Firestore timestamps
    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

    let result;

    switch (reportType) {
      case 'Call Volume':
        result = await getCallVolume(startTimestamp, endTimestamp, emergencyType);
        break;
      case 'Average Assessment Speed':
        result = await getAverageAssessmentSpeed(startTimestamp, endTimestamp);
        break;
      case 'Average Dispatch Time':
        result = await getAverageDispatchTime(startTimestamp, endTimestamp);
        break;
      case 'Average Resolution Time':
        result = await getAverageResolutionTime(startTimestamp, endTimestamp);
        break;
      case 'Average Confirm Turnaround Time':
        result = await getAverageConfirmTurnaround(startTimestamp, endTimestamp);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    return res.json(result);
  } catch (err) {
    console.error('Error generating report:', err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
};

/**
 * Get the call volume between the given dates
 */
async function getCallVolume(startTimestamp, endTimestamp, emergencyType) {
  let query = db.collection('calls')
    .where('timestamp', '>=', startTimestamp)
    .where('timestamp', '<=', endTimestamp);

  if (emergencyType && emergencyType !== 'ALL') {
    query = query.where('emergencyType', '==', emergencyType);
  }

  const snapshot = await query.get();
  
  // Calculate total calls
  const totalCalls = snapshot.size;
  
  // Calculate breakdown by type
  let breakdownByType = {};
  
  // Always process the breakdown, regardless of filter
  snapshot.forEach(doc => {
    const data = doc.data();
    const type = data.emergencyType || 'UNASSESSED';
    breakdownByType[type] = (breakdownByType[type] || 0) + 1;
  });

  return {
    totalCalls,
    breakdownByType
  };
}

/**
 * Get the average assessment speed between the given dates
 * This is calculated as (assessedAt - timestamp) for each call
 */
async function getAverageAssessmentSpeed(startTimestamp, endTimestamp) {
  const snapshot = await db.collection('calls')
    .where('timestamp', '>=', startTimestamp)
    .where('timestamp', '<=', endTimestamp)
    .where('status', '==', 'COMPLETED')
    .get();

  if (snapshot.empty) {
    return { averageTime: 0, unit: 'minutes' };
  }

  let totalMinutes = 0;
  let breakdownByType = {};
  let countByType = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.timestamp && data.assessedAt) {
      // Convert timestamps to milliseconds
      const startMs = data.timestamp.toMillis();
      const endMs = data.assessedAt.toMillis();
      
      // Calculate difference in minutes
      const diffMinutes = (endMs - startMs) / (1000 * 60);
      
      totalMinutes += diffMinutes;
      
      // Add to type breakdown
      const type = data.emergencyType || 'UNKNOWN';
      if (!breakdownByType[type]) {
        breakdownByType[type] = 0;
        countByType[type] = 0;
      }
      breakdownByType[type] += diffMinutes;
      countByType[type]++;
    }
  });

  // Calculate average
  const averageMinutes = totalMinutes / snapshot.size;
  
  // Calculate averages per type with two decimal places
  Object.keys(breakdownByType).forEach(type => {
    breakdownByType[type] = Math.round((breakdownByType[type] / countByType[type]) * 100) / 100;
  });

  return {
    averageTime: Math.round(averageMinutes * 100) / 100,
    unit: 'minutes',
    breakdownByType
  };
}

/**
 * Get the average dispatch time between the given dates
 * This is calculated as (dispatch.dispatchTime - call.timestamp) for each corresponding call and dispatch
 */
async function getAverageDispatchTime(startTimestamp, endTimestamp) {
  // First, get all assessed calls within the date range
  const callsSnapshot = await db.collection('calls')
    .where('timestamp', '>=', startTimestamp)
    .where('timestamp', '<=', endTimestamp)
    .where('status', 'in', ['DISPATCHED', 'IN_PROGRESS', 'COMPLETED'])
    .get();

  if (callsSnapshot.empty) {
    return { averageTime: 0, unit: 'minutes' };
  }

  let totalMinutes = 0;
  let count = 0;
  let breakdownByType = {};
  let countByType = {};

  // For each call, find its corresponding dispatch
  for (const callDoc of callsSnapshot.docs) {
    const callData = callDoc.data();
    
    // Find the dispatch for this call
    const dispatchSnapshot = await db.collection('dispatches')
      .where('callId', '==', callDoc.id)
      .limit(1)
      .get();

    if (!dispatchSnapshot.empty) {
      const dispatchData = dispatchSnapshot.docs[0].data();
      
      if (callData.timestamp && dispatchData.dispatchTime) {
        // Convert timestamps to milliseconds
        const callTimestamp = callData.timestamp.toMillis();
        const dispatchTimestamp = dispatchData.dispatchTime.toMillis();
        
        // Calculate difference in minutes
        const diffMinutes = (dispatchTimestamp - callTimestamp) / (1000 * 60);
        
        totalMinutes += diffMinutes;
        count++;
        
        // Add to type breakdown
        const type = callData.emergencyType || 'UNKNOWN';
        if (!breakdownByType[type]) {
          breakdownByType[type] = 0;
          countByType[type] = 0;
        }
        breakdownByType[type] += diffMinutes;
        countByType[type]++;
      }
    }
  }

  // Calculate averages
  const averageMinutes = count > 0 ? totalMinutes / count : 0;
  
  // Calculate averages per type with two decimal places
  Object.keys(breakdownByType).forEach(type => {
    breakdownByType[type] = Math.round((breakdownByType[type] / countByType[type]) * 100) / 100;
  });

  return {
    averageTime: Math.round(averageMinutes * 100) / 100,
    unit: 'minutes',
    breakdownByType
  };
}

/**
 * Get the average resolution time between the given dates
 * This is calculated as (report.interventionCompletionTime - dispatch.confirmedAt) for each corresponding report and dispatch
 */
async function getAverageResolutionTime(startTimestamp, endTimestamp) {
  // Get all reports within the date range
  const reportsSnapshot = await db.collection('reports')
    .where('submittedAt', '>=', startTimestamp)
    .where('submittedAt', '<=', endTimestamp)
    .get();

  if (reportsSnapshot.empty) {
    return { averageTime: 0, unit: 'minutes' };
  }

  let totalMinutes = 0;
  let count = 0;
  let breakdownByType = {};
  let countByType = {};

  // For each report, find its dispatch and call
  for (const reportDoc of reportsSnapshot.docs) {
    const reportData = reportDoc.data();
    
    if (reportData.interventionCompletionTime && reportData.dispatchId) {
      // Get the dispatch
      const dispatchDoc = await db.collection('dispatches').doc(reportData.dispatchId).get();
      
      if (dispatchDoc.exists) {
        const dispatchData = dispatchDoc.data();
        
        if (dispatchData.confirmedAt) {
          // Convert timestamps to milliseconds
          const startMs = dispatchData.confirmedAt.toMillis();
          const endMs = reportData.interventionCompletionTime.toMillis();
          
          // Calculate difference in minutes
          const diffMinutes = (endMs - startMs) / (1000 * 60);
          
          // Only include if the time is positive and reasonable (less than 24 hours)
          if (diffMinutes > 0 && diffMinutes < 24 * 60) {
            totalMinutes += diffMinutes;
            count++;
            
            // Get call type for breakdown
            if (dispatchData.callId) {
              const callDoc = await db.collection('calls').doc(dispatchData.callId).get();
              if (callDoc.exists) {
                const callData = callDoc.data();
                const type = callData.emergencyType || 'UNKNOWN';
                
                if (!breakdownByType[type]) {
                  breakdownByType[type] = 0;
                  countByType[type] = 0;
                }
                breakdownByType[type] += diffMinutes;
                countByType[type]++;
              }
            }
          }
        }
      }
    }
  }

  // Calculate averages
  const averageMinutes = count > 0 ? totalMinutes / count : 0;
  
  // Calculate averages per type with two decimal places
  Object.keys(breakdownByType).forEach(type => {
    breakdownByType[type] = Math.round((breakdownByType[type] / countByType[type]) * 100) / 100;
  });

  return {
    averageTime: Math.round(averageMinutes * 100) / 100,
    unit: 'minutes',
    breakdownByType
  };
}

/**
 * Get the average confirm turnaround time between the given dates
 * This is calculated as (dispatch.confirmedAt - dispatch.dispatchTime) for each dispatch
 */
async function getAverageConfirmTurnaround(startTimestamp, endTimestamp) {
  // Get all confirmed dispatches within the date range
  const dispatchesSnapshot = await db.collection('dispatches')
    .where('dispatchTime', '>=', startTimestamp)
    .where('dispatchTime', '<=', endTimestamp)
    .where('status', 'in', ['CONFIRMED', 'COMPLETED'])
    .get();

  if (dispatchesSnapshot.empty) {
    return { averageTime: 0, unit: 'minutes' };
  }

  let totalMinutes = 0;
  let count = 0;
  let breakdownByType = {};
  let countByType = {};

  // For each dispatch, calculate the time between dispatch and confirmation
  for (const dispatchDoc of dispatchesSnapshot.docs) {
    const dispatchData = dispatchDoc.data();
    
    if (dispatchData.dispatchTime && dispatchData.confirmedAt) {
      // Convert timestamps to milliseconds
      const dispatchTimestamp = dispatchData.dispatchTime.toMillis();
      const confirmTimestamp = dispatchData.confirmedAt.toMillis();
      
      // Calculate difference in minutes
      const diffMinutes = (confirmTimestamp - dispatchTimestamp) / (1000 * 60);
      
      // Only include reasonable values (less than 24 hours)
      if (diffMinutes > 0 && diffMinutes < 24 * 60) {
        totalMinutes += diffMinutes;
        count++;
        
        // Get call type for breakdown
        if (dispatchData.callId) {
          const callDoc = await db.collection('calls').doc(dispatchData.callId).get();
          if (callDoc.exists) {
            const callData = callDoc.data();
            const type = callData.emergencyType || 'UNKNOWN';
            
            if (!breakdownByType[type]) {
              breakdownByType[type] = 0;
              countByType[type] = 0;
            }
            breakdownByType[type] += diffMinutes;
            countByType[type]++;
          }
        }
      }
    }
  }

  // Calculate averages
  const averageMinutes = count > 0 ? totalMinutes / count : 0;
  
  // Calculate averages per type with two decimal places
  Object.keys(breakdownByType).forEach(type => {
    breakdownByType[type] = Math.round((breakdownByType[type] / countByType[type]) * 100) / 100;
  });

  return {
    averageTime: Math.round(averageMinutes * 100) / 100,
    unit: 'minutes',
    breakdownByType
  };
} 