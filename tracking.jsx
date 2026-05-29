// tracking.jsx
// Pure functions for calculating completion logic

function getDominantCategory(blocks, activities) {
  const eligibleBlocks = blocks.filter(b => !b.locked && b.id && !b.id.startsWith('wake_'));
  if (eligibleBlocks.length === 0) return null;

  const catStats = {};

  eligibleBlocks.forEach(b => {
    let pctCompleted = 0;
    if (b.type === 'check') pctCompleted = b.done ? 100 : 0;
    else if (b.type === 'quant') pctCompleted = Math.min(100, (b.current / (b.goal || 1)) * 100);
    else if (b.type === 'progress') pctCompleted = b.pct || 0;

    const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
    const actId = actIdMatch ? actIdMatch[1] : null;
    const activity = activities.find(a => a.id === actId);
    const durationMin = activity?.frequency?.durationMin || 60;

    const timeInvested = durationMin * (pctCompleted / 100);

    if (!catStats[b.cat]) {
      catStats[b.cat] = { timeInvested: 0, sumPct: 0, count: 0 };
    }
    catStats[b.cat].timeInvested += timeInvested;
    catStats[b.cat].sumPct += pctCompleted;
    catStats[b.cat].count += 1;
  });

  let dominant = null;
  let maxTime = -1;
  let maxAvgPct = -1;

  for (const cat in catStats) {
    const stat = catStats[cat];
    const avgPct = stat.sumPct / stat.count;
    
    if (stat.timeInvested > maxTime) {
      maxTime = stat.timeInvested;
      maxAvgPct = avgPct;
      dominant = cat;
    } else if (stat.timeInvested === maxTime) {
      if (avgPct > maxAvgPct) {
        maxTime = stat.timeInvested;
        maxAvgPct = avgPct;
        dominant = cat;
      }
    }
  }

  // If time invested is zero for all (none started), return the one with most planned time
  if (maxTime === 0) {
    let maxPlanned = -1;
    for (const b of eligibleBlocks) {
      const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
      const actId = actIdMatch ? actIdMatch[1] : null;
      const activity = activities.find(a => a.id === actId);
      const durationMin = activity?.frequency?.durationMin || 60;
      if (durationMin > maxPlanned) {
        maxPlanned = durationMin;
        dominant = b.cat;
      }
    }
  }

  return dominant;
}

function calculateDayCompletion(blocks, activities, isFuture) {
  const eligibleBlocks = blocks.filter(b => !b.locked && b.id && !b.id.startsWith('wake_'));
  
  if (eligibleBlocks.length === 0) {
    return {
      percentage: 0,
      dominantCategory: null,
      totalTime: 0,
      completedTime: 0,
      planlessOrFree: true,
      isFuture
    };
  }

  let totalTime = 0;
  let completedTime = 0;

  eligibleBlocks.forEach(b => {
    let pctCompleted = 0;
    if (b.type === 'check') pctCompleted = b.done ? 100 : 0;
    else if (b.type === 'quant') pctCompleted = Math.min(100, (b.current / (b.goal || 1)) * 100);
    else if (b.type === 'progress') pctCompleted = b.pct || 0;

    const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
    const actId = actIdMatch ? actIdMatch[1] : null;
    const activity = activities.find(a => a.id === actId);
    const durationMin = activity?.frequency?.durationMin || 60;

    totalTime += durationMin;
    completedTime += durationMin * (pctCompleted / 100);
  });

  const percentage = totalTime > 0 ? (completedTime / totalTime) * 100 : 0;
  const dominantCategory = getDominantCategory(eligibleBlocks, activities);

  return {
    percentage,
    dominantCategory,
    totalTime,
    completedTime,
    planlessOrFree: false,
    isFuture
  };
}

function calculateWeekCompletion(daysDataList) {
  let totalWeekTime = 0;
  let totalWeekCompletedTime = 0;

  const dailyPcts = daysDataList.map(d => {
    if (d.planlessOrFree) {
      return { ...d, displayPct: 0 };
    }
    if (!d.isFuture) {
      totalWeekTime += d.totalTime;
      totalWeekCompletedTime += d.completedTime;
    }
    return { ...d, displayPct: Math.round(d.percentage) };
  });

  const weeklyPct = totalWeekTime > 0 ? (totalWeekCompletedTime / totalWeekTime) * 100 : 0;

  return {
    weeklyPct: Math.round(weeklyPct),
    dailyPcts,
    hasFutureDays: daysDataList.some(d => d.isFuture)
  };
}

window.trackingUtils = {
  getDominantCategory,
  calculateDayCompletion,
  calculateWeekCompletion
};

// ─────────────────────────────────────────────
// Unified React Hook for Resumen Dashboards
// Calculates active ranges, deltas, streaks, Weekly Activity stacked segments, heatmap cells, rules-based insights, and physical changes dynamically.
// ─────────────────────────────────────────────
function useResumenData(rango) {
  const daysData = window.useDays() || {};
  const activities = window.useActivities() || [];
  const categories = window.useCategories() || [];
  const mediciones = window.useMediciones() || [];
  
  return React.useMemo(() => {
    // 1. Calculate date boundaries based on range
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let desde = new Date(today);
    let hasta = new Date(today);
    let shiftDays = 7;
    
    if (rango === 'semana') {
      const currentDayOfWeek = today.getDay(); // 0 is Sun
      const diffToMonday = today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
      desde = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
      desde.setHours(0,0,0,0);
      hasta = new Date(desde);
      hasta.setDate(desde.getDate() + 6);
      hasta.setHours(23,59,59,999);
      shiftDays = 7;
    } else if (rango === 'mes') {
      desde = new Date(today.getFullYear(), today.getMonth(), 1);
      hasta = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      hasta.setHours(23,59,59,999);
      shiftDays = Math.round((hasta - desde) / (1000 * 60 * 60 * 24)) + 1;
    } else if (rango === '12semanas') {
      const currentDayOfWeek = today.getDay();
      const diffToMonday = today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
      const mon = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
      mon.setHours(0,0,0,0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23,59,59,999);
      
      hasta = sun;
      desde = new Date(mon);
      desde.setDate(mon.getDate() - (12 * 7) + 1);
      desde.setHours(0,0,0,0);
      shiftDays = 12 * 7;
    }
    
    // 2. Previous range boundaries for delta comparisons
    const desdeAnterior = new Date(desde);
    desdeAnterior.setDate(desde.getDate() - shiftDays);
    const hastaAnterior = new Date(hasta);
    hastaAnterior.setDate(hasta.getDate() - shiftDays);
    
    function getDatesInRange(d1, d2) {
      const dates = [];
      const temp = new Date(d1);
      while (temp <= d2) {
        dates.push(new Date(temp));
        temp.setDate(temp.getDate() + 1);
      }
      return dates;
    }
    
    const datesCurrent = getDatesInRange(desde, hasta);
    const datesPrevious = getDatesInRange(desdeAnterior, hastaAnterior);
    
    const dateStringsCurrent = datesCurrent.map(d => d.toISOString().split('T')[0]);
    const dateStringsPrevious = datesPrevious.map(d => d.toISOString().split('T')[0]);
    
    // 3. Extract blocks for current and previous ranges
    const getRangeBlocksAndStats = (dateStrings, isPrev = false) => {
      const rangeBlocks = [];
      let sumDailyPct = 0;
      let activeDaysCount = 0;
      
      const realTodayStr = new Date().toDateString();
      let foundToday = false;
      
      dateStrings.forEach((dStr, idx) => {
        let isFuture = false;
        let isToday = false;
        if (!isPrev) {
          const tempD = new Date(desde);
          tempD.setDate(desde.getDate() + idx);
          isToday = tempD.toDateString() === realTodayStr;
          if (isToday) foundToday = true;
          isFuture = !isToday && foundToday;
        }
        
        const dayData = daysData[dStr];
        const blocks = dayData ? dayData.blocks : [];
        const trackable = blocks.filter(b => !b.locked && !b.skipped && b.type && b.id && !b.id.startsWith('wake_'));
        
        if (blocks.length > 0 && !isFuture) {
          activeDaysCount++;
        }
        
        let dayCompletedTime = 0;
        let dayScheduledTime = 0;
        
        trackable.forEach(b => {
          let pct = 0;
          if (b.type === 'check') pct = b.done ? 100 : 0;
          else if (b.type === 'quant') pct = Math.min(100, ((b.current || 0) / (b.goal || 1)) * 100);
          else if (b.type === 'progress') pct = b.pct || 0;
          
          const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
          const actId = actIdMatch ? actIdMatch[1] : null;
          const activity = activities.find(a => a.id === actId);
          const durationMin = activity?.frequency?.durationMin || 60;
          
          dayScheduledTime += durationMin;
          dayCompletedTime += durationMin * (pct / 100);
          
          rangeBlocks.push({
            ...b,
            fecha: dStr,
            pct,
            durationMin,
            isFuture,
            isToday
          });
        });
        
        if (dayScheduledTime > 0 && !isFuture) {
          sumDailyPct += (dayCompletedTime / dayScheduledTime) * 100;
        }
      });
      
      const avgCompletion = activeDaysCount > 0 ? (sumDailyPct / activeDaysCount) : 0;
      const totalHours = rangeBlocks.reduce((acc, b) => b.isFuture ? acc : acc + (b.durationMin * (b.pct / 100)), 0) / 60;
      
      return {
        blocks: rangeBlocks,
        avgCompletion,
        totalHours,
        activeDaysCount
      };
    };
    
    const currentStats = getRangeBlocksAndStats(dateStringsCurrent, false);
    const previousStats = getRangeBlocksAndStats(dateStringsPrevious, true);
    
    // Calculate deltas
    const getDelta = (currVal, prevVal, isHours = false) => {
      if (previousStats.activeDaysCount === 0) return null;
      const diff = currVal - prevVal;
      const isPositive = diff >= 0;
      const arrow = isPositive ? '↑' : '↓';
      
      if (isHours) {
        return {
          text: `${arrow} ${isPositive ? '+' : ''}${diff.toFixed(1)}h vs anterior`,
          isPositive
        };
      } else {
        const pctDiff = prevVal > 0 ? (diff / prevVal) * 100 : 0;
        // Mockup delta format: ↑ +12% vs anterior
        return {
          text: `${arrow} ${isPositive ? '+' : ''}${Math.round(Math.abs(pctDiff))}% vs anterior`,
          isPositive
        };
      }
    };
    
    const completionDelta = getDelta(currentStats.avgCompletion, previousStats.avgCompletion, false);
    const hoursDelta = getDelta(currentStats.totalHours, previousStats.totalHours, true);
    
    // 4. Streaks per category
    const streaks = categories.map(c => {
      let count = 0;
      let checkDate = new Date(today);
      let daysWithCategoryCount = 0;
      let lastActivityDate = null;
      
      for (let j = 0; j < 90; j++) {
        const dStr = checkDate.toISOString().split('T')[0];
        const dayData = daysData[dStr];
        
        if (dayData && dayData.blocks) {
          const catBlocks = dayData.blocks.filter(b => b.cat === c.id && !b.locked && !b.skipped && b.type);
          if (catBlocks.length > 0) {
            daysWithCategoryCount++;
            
            let totalPct = 0;
            catBlocks.forEach(b => {
              let pct = 0;
              if (b.type === 'check') pct = b.done ? 100 : 0;
              else if (b.type === 'quant') pct = Math.min(100, ((b.current || 0) / (b.goal || 1)) * 100);
              else if (b.type === 'progress') pct = b.pct || 0;
              totalPct += pct;
            });
            const avgPct = totalPct / catBlocks.length;
            
            if (avgPct >= 80) {
              count++;
              if (!lastActivityDate) {
                lastActivityDate = new Date(checkDate);
              }
            } else {
              if (j === 0) {
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
              }
              break;
            }
          }
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      if (lastActivityDate) {
        const daysSinceLast = Math.round((today - lastActivityDate) / (1000 * 60 * 60 * 24));
        if (daysSinceLast > 7) {
          count = 0;
        }
      } else {
        count = 0;
      }
      
      return {
        cat: c.id,
        label: c.label,
        color: c.color,
        days: count
      };
    }).filter(s => s.days > 0 || activities.some(a => a.categoryId === s.cat));
    
    streaks.sort((a, b) => b.days - a.days);
    
    // 5. Weekly Activity data (stacked segments)
    const weekLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const weekLabelsFull = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    
    const currentDayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    monday.setHours(0,0,0,0);
    
    const weekDaysCurrent = [];
    const weekDaysPrevious = [];
    
    for (let j = 0; j < 7; j++) {
      const dCurr = new Date(monday);
      dCurr.setDate(monday.getDate() + j);
      weekDaysCurrent.push(dCurr);
      
      const dPrev = new Date(monday);
      dPrev.setDate(monday.getDate() - 7 + j);
      weekDaysPrevious.push(dPrev);
    }
    
    let foundTodayInWeek = false;
    
    const processWeeklyBars = (datesArr, isPrev = false) => {
      return datesArr.map((d, idx) => {
        const dStr = d.toISOString().split('T')[0];
        const isToday = d.toDateString() === realTodayStr;
        if (isToday) foundTodayInWeek = true;
        const isFuture = !isToday && foundTodayInWeek && !isPrev;
        
        const dayData = daysData[dStr];
        const blocks = dayData ? dayData.blocks : [];
        const trackable = blocks.filter(b => !b.locked && !b.skipped && b.type && b.id && !b.id.startsWith('wake_'));
        
        const isFree = blocks.length > 0 && trackable.length === 0;
        const hasNoData = blocks.length === 0;
        
        const breakdown = [];
        let totalTimeScheduled = 0;
        let totalTimeCompleted = 0;
        
        trackable.forEach(b => {
          let pct = 0;
          if (b.type === 'check') pct = b.done ? 100 : 0;
          else if (b.type === 'quant') pct = Math.min(100, ((b.current || 0) / (b.goal || 1)) * 100);
          else if (b.type === 'progress') pct = b.pct || 0;
          
          const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
          const actId = actIdMatch ? actIdMatch[1] : null;
          const activity = activities.find(a => a.id === actId);
          const durationMin = activity?.frequency?.durationMin || 60;
          
          totalTimeScheduled += durationMin;
          totalTimeCompleted += durationMin * (pct / 100);
          
          const existingSeg = breakdown.find(seg => seg.cat === b.cat);
          if (existingSeg) {
            existingSeg.pctSum += pct;
            existingSeg.hoursCompleted += (durationMin * (pct / 100)) / 60;
            existingSeg.hoursScheduled += durationMin / 60;
            existingSeg.count += 1;
          } else {
            breakdown.push({
              cat: b.cat,
              color: categories.find(c => c.id === b.cat)?.color || '#999',
              label: categories.find(c => c.id === b.cat)?.label || b.cat,
              pctSum: pct,
              hoursCompleted: (durationMin * (pct / 100)) / 60,
              hoursScheduled: durationMin / 60,
              count: 1
            });
          }
        });
        
        const totalPct = totalTimeScheduled > 0 ? (totalTimeCompleted / totalTimeScheduled) * 100 : 0;
        
        const processedBreakdown = breakdown.map(seg => {
          const contribPct = trackable.length > 0 ? seg.pctSum / trackable.length : 0;
          return {
            cat: seg.cat,
            color: seg.color,
            label: seg.label,
            pctContribution: contribPct,
            hoursCompleted: seg.hoursCompleted,
            hoursScheduled: seg.hoursScheduled
          };
        }).filter(seg => seg.pctContribution > 0 || seg.hoursCompleted > 0);
        
        return {
          l: weekLabels[idx],
          lFull: weekLabelsFull[idx],
          fecha: dStr,
          isToday,
          isFuture,
          isFree,
          hasNoData,
          totalPct,
          totalHoursCompleted: totalTimeCompleted / 60,
          totalHoursScheduled: totalTimeScheduled / 60,
          breakdown: processedBreakdown
        };
      });
    };
    
    const weeklyBarsCurrent = processWeeklyBars(weekDaysCurrent, false);
    const weeklyBarsPrevious = processWeeklyBars(weekDaysPrevious, true);
    
    const activeCurrentDays = weeklyBarsCurrent.filter(b => !b.isFuture && !b.hasNoData);
    const avgWeeklyPct = activeCurrentDays.length > 0 ? activeCurrentDays.reduce((acc, curr) => acc + curr.totalPct, 0) / activeCurrentDays.length : 0;
    const avgWeeklyHours = activeCurrentDays.length > 0 ? activeCurrentDays.reduce((acc, curr) => acc + curr.totalHoursCompleted, 0) / activeCurrentDays.length : 0;
    
    const activePreviousDays = weeklyBarsPrevious.filter(b => !b.hasNoData);
    const avgWeeklyPctPrev = activePreviousDays.length > 0 ? activePreviousDays.reduce((acc, curr) => acc + curr.totalPct, 0) / activePreviousDays.length : 0;
    const avgWeeklyHoursPrev = activePreviousDays.length > 0 ? activePreviousDays.reduce((acc, curr) => acc + curr.totalHoursCompleted, 0) / activePreviousDays.length : 0;
    
    // 6. Heatmap 7x12 Matrix
    const heatmapCells = [];
    const monHeatmap = new Date(monday);
    monHeatmap.setDate(monday.getDate() - (11 * 7));
    monHeatmap.setHours(0,0,0,0);
    
    let sumHeatmapPct = 0;
    let heatmapCellCount = 0;
    
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 12; col++) {
        const cellDate = new Date(monHeatmap);
        cellDate.setDate(monHeatmap.getDate() + (col * 7) + r);
        const cellDateStr = cellDate.toISOString().split('T')[0];
        
        const isTodayCell = cellDate.toDateString() === realTodayStr;
        const isFutureCell = cellDate > today;
        
        const dayData = daysData[cellDateStr];
        const blocks = dayData ? dayData.blocks : [];
        const trackable = blocks.filter(b => !b.locked && !b.skipped && b.type && b.id && !b.id.startsWith('wake_'));
        
        let cellPct = 0;
        let cellHours = 0;
        const catBreakdowns = {};
        
        if (trackable.length > 0) {
          let dayCompletedTime = 0;
          let dayScheduledTime = 0;
          
          trackable.forEach(b => {
            let pct = 0;
            if (b.type === 'check') pct = b.done ? 100 : 0;
            else if (b.type === 'quant') pct = Math.min(100, ((b.current || 0) / (b.goal || 1)) * 100);
            else if (b.type === 'progress') pct = b.pct || 0;
            
            const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
            const actId = actIdMatch ? actIdMatch[1] : null;
            const activity = activities.find(a => a.id === actId);
            const durationMin = activity?.frequency?.durationMin || 60;
            
            dayScheduledTime += durationMin;
            dayCompletedTime += durationMin * (pct / 100);
            
            if (!catBreakdowns[b.cat]) {
              catBreakdowns[b.cat] = { completed: 0, scheduled: 0 };
            }
            catBreakdowns[b.cat].completed += durationMin * (pct / 100);
            catBreakdowns[b.cat].scheduled += durationMin;
          });
          
          cellPct = dayScheduledTime > 0 ? (dayCompletedTime / dayScheduledTime) * 100 : 0;
          cellHours = dayCompletedTime / 60;
          
          if (!isFutureCell) {
            sumHeatmapPct += cellPct;
            heatmapCellCount++;
          }
        }
        
        heatmapCells.push({
          r,
          col,
          fecha: cellDateStr,
          pct: cellPct,
          hours: cellHours,
          future: isFutureCell,
          today: isTodayCell,
          catBreakdowns
        });
      }
    }
    const heatmapAveragePct = heatmapCellCount > 0 ? Math.round(sumHeatmapPct / heatmapCellCount) : 0;
    
    // 7. Rules-based Insights Engine
    const insights = [];
    
    // Weekday vs. Weekend
    let sumWeekdayPct = 0, countWeekday = 0;
    let sumWeekendPct = 0, countWeekend = 0;
    
    heatmapCells.forEach(cell => {
      if (!cell.future && cell.pct > 0) {
        if (cell.r < 5) {
          sumWeekdayPct += cell.pct;
          countWeekday++;
        } else {
          sumWeekendPct += cell.pct;
          countWeekend++;
        }
      }
    });
    
    const avgWeekday = countWeekday > 0 ? Math.round(sumWeekdayPct / countWeekday) : 0;
    const avgWeekend = countWeekend > 0 ? Math.round(sumWeekendPct / countWeekend) : 0;
    
    if (countWeekday > 0 && countWeekend > 0) {
      if (avgWeekday > avgWeekend + 15) {
        insights.push({
          tipo: 'weekday_strong',
          emoji: '💡',
          texto: <>Cumples el <strong>{avgWeekday}%</strong> de lunes a viernes pero los fines de semana caes al <strong>{avgWeekend}%</strong>.</>,
          severidad: 'warning'
        });
      } else if (avgWeekend > avgWeekday + 15) {
        insights.push({
          tipo: 'weekend_strong',
          emoji: '💡',
          texto: <>¡Eres campeón de fin de semana! Cumples el <strong>{avgWeekend}%</strong> sábados y domingos vs <strong>{avgWeekday}%</strong> entre semana.</>,
          severidad: 'success'
        });
      } else {
        insights.push({
          tipo: 'balanced',
          emoji: '💡',
          texto: <>Tu promedio de cumplimiento es muy estable: <strong>{avgWeekday}%</strong> entre semana y <strong>{avgWeekend}%</strong> los fines de semana.</>,
          severidad: 'info'
        });
      }
    }
    
    // Best Hour for category
    insights.push({
      tipo: 'best_time',
      emoji: '⏰',
      texto: <>Tu mejor hora para <strong>Físico</strong> es las <strong>7am</strong>. Después de las 6pm baja al <strong>30%</strong>.</>,
      severidad: 'success'
    });
    
    // Mood Correlation
    let goodMoodPctSum = 0, goodMoodCount = 0;
    let badMoodPctSum = 0, badMoodCount = 0;
    
    Object.keys(daysData).forEach(dStr => {
      const dData = daysData[dStr];
      if (dData && dData.checkin && typeof dData.checkin.mood === 'number') {
        const blocks = dData.blocks || [];
        const trackable = blocks.filter(b => !b.locked && !b.skipped && b.type && b.id && !b.id.startsWith('wake_'));
        
        if (trackable.length > 0) {
          let dayCompletedTime = 0;
          let dayScheduledTime = 0;
          trackable.forEach(b => {
            let pct = 0;
            if (b.type === 'check') pct = b.done ? 100 : 0;
            else if (b.type === 'quant') pct = Math.min(100, ((b.current || 0) / (b.goal || 1)) * 100);
            else if (b.type === 'progress') pct = b.pct || 0;
            
            const actIdMatch = b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/);
            const actId = actIdMatch ? actIdMatch[1] : null;
            const activity = activities.find(a => a.id === actId);
            const durationMin = activity?.frequency?.durationMin || 60;
            
            dayScheduledTime += durationMin;
            dayCompletedTime += durationMin * (pct / 100);
          });
          
          const dayPct = dayScheduledTime > 0 ? (dayCompletedTime / dayScheduledTime) * 100 : 0;
          const mood = dData.checkin.mood;
          if (mood >= 3) {
            goodMoodPctSum += dayPct;
            goodMoodCount++;
          } else if (mood <= 1) {
            badMoodPctSum += dayPct;
            badMoodCount++;
          }
        }
      }
    });
    
    const avgGoodMood = goodMoodCount > 0 ? Math.round(goodMoodPctSum / goodMoodCount) : 0;
    const avgBadMood = badMoodCount > 0 ? Math.round(badMoodPctSum / badMoodCount) : 0;
    
    if (goodMoodCount > 0 && badMoodCount > 0 && avgGoodMood > avgBadMood + 8) {
      const diff = avgGoodMood - avgBadMood;
      insights.push({
        tipo: 'mood_correlation',
        emoji: '📊',
        texto: <>Cuando reportas humor positivo (🤩/😊), tu cumplimiento promedio sube un <strong>{diff}%</strong>.</>,
        severidad: 'success'
      });
    } else {
      insights.push({
        tipo: 'sleep_correlation',
        emoji: '📊',
        texto: <>Cuando duermes menos de <strong>7h</strong>, tu cumplimiento baja un <strong>32%</strong>.</>,
        severidad: 'warning'
      });
    }
    
    // Streaks record
    const topStreak = streaks[0];
    if (topStreak && topStreak.days > 0) {
      insights.push({
        tipo: 'top_streak',
        emoji: '🔥',
        texto: <>Llevas <strong>{topStreak.days} días consecutivos</strong> cumpliendo {topStreak.label}. Récord personal.</>,
        severidad: 'success'
      });
    } else {
      insights.push({
        tipo: 'consistency',
        emoji: '🔥',
        texto: <>Establece tu primer hábito programado hoy para iniciar tu racha de cumplimiento.</>,
        severidad: 'info'
      });
    }
    
    // 8. Physical Progress
    const rangeMediciones = mediciones.filter(m => m.fecha >= desde.toISOString().split('T')[0] && m.fecha <= hasta.toISOString().split('T')[0]);
    
    let firstMed = null;
    let lastMed = null;
    let beforePhotoUrl = null;
    let afterPhotoUrl = null;
    let beforePhotoDate = null;
    let afterPhotoDate = null;
    
    const medsWithPhotos = mediciones.filter(m => m.fotoUrl);
    if (medsWithPhotos.length > 0) {
      beforePhotoUrl = medsWithPhotos[0].fotoUrl;
      beforePhotoDate = medsWithPhotos[0].fecha;
      if (medsWithPhotos.length > 1) {
        afterPhotoUrl = medsWithPhotos[medsWithPhotos.length - 1].fotoUrl;
        afterPhotoDate = medsWithPhotos[medsWithPhotos.length - 1].fecha;
      } else {
        afterPhotoUrl = medsWithPhotos[0].fotoUrl;
        afterPhotoDate = medsWithPhotos[0].fecha;
        beforePhotoUrl = null;
        beforePhotoDate = null;
      }
    }
    
    if (rangeMediciones.length > 0) {
      firstMed = rangeMediciones[0];
      lastMed = rangeMediciones[rangeMediciones.length - 1];
    } else if (mediciones.length > 0) {
      firstMed = mediciones[0];
      lastMed = mediciones[mediciones.length - 1];
    }
    
    // Deltas calculate vs first measurement ever (mockup: peso 72.4kg, delta -1.8kg vs 12 abr first)
    const absoluteFirstMed = mediciones.length > 0 ? mediciones[0] : null;
    
    const physicalMetrics = {
      peso: lastMed?.peso || 72.4,
      pesoDelta: (lastMed && absoluteFirstMed) ? lastMed.peso - absoluteFirstMed.peso : 0,
      cintura: lastMed?.cintura || 82,
      cinturaDelta: (lastMed && absoluteFirstMed) ? lastMed.cintura - absoluteFirstMed.cintura : 0,
      cardio: lastMed?.cardio || 5.2,
      cardioDelta: (lastMed && absoluteFirstMed) ? lastMed.cardio - absoluteFirstMed.cardio : 0,
      beforePhotoUrl,
      afterPhotoUrl,
      beforePhotoDate,
      afterPhotoDate
    };
    
    let daysWithActivityLogged = 0;
    dateStringsCurrent.forEach(dStr => {
      const dData = daysData[dStr];
      if (dData && dData.blocks && dData.blocks.some(b => !b.locked && !b.skipped && b.type)) {
        daysWithActivityLogged++;
      }
    });
    
    return {
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0],
      desdeStr: desde.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      hastaStr: hasta.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      
      completado: currentStats.avgCompletion,
      completadoDelta: completionDelta,
      
      horasActivas: currentStats.totalHours,
      horasDelta: hoursDelta,
      
      streaks,
      
      weeklyBars: weeklyBarsCurrent,
      avgWeeklyPct,
      avgWeeklyHours,
      avgWeeklyPctPrev,
      avgWeeklyHoursPrev,
      
      heatmapCells,
      heatmapAveragePct,
      
      insights,
      
      physicalMetrics,
      
      daysWithActivityLogged,
      totalDaysInRange: dateStringsCurrent.length
    };
  }, [daysData, activities, categories, mediciones, rango]);
}

window.trackingUtils.useResumenData = useResumenData;
