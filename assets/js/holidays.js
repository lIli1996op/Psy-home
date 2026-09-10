// ============================================================
// 国家法定节假日数据库（内置 2024 / 2025 全年数据）
// 数据来源：国务院办公厅关于部分节假日安排的通知
// holidays: 'M-D' -> 节假日名称（仅假期首日写名称，其余为空）
// makeup:   调休补班日期数组 'M-D'
// 设计目标：自动识别全年法定放假 / 周末调休补班，无需手动录入。
// ============================================================
window.HOLIDAY_DB = {
  2024: {
    holidays: {
      '1-1': '元旦',
      '2-10': '春节', '2-11': '', '2-12': '', '2-13': '', '2-14': '', '2-15': '', '2-16': '', '2-17': '',
      '4-4': '清明节', '4-5': '', '4-6': '',
      '5-1': '劳动节', '5-2': '', '5-3': '', '5-4': '', '5-5': '',
      '6-10': '端午节',
      '9-15': '中秋节', '9-16': '', '9-17': '',
      '10-1': '国庆节', '10-2': '', '10-3': '', '10-4': '', '10-5': '', '10-6': '', '10-7': ''
    },
    makeup: ['2-4', '2-18', '4-7', '4-28', '5-11', '9-14', '9-29', '10-12']
  },
  2025: {
    holidays: {
      '1-1': '元旦',
      '1-28': '春节', '1-29': '', '1-30': '', '1-31': '', '2-1': '', '2-2': '', '2-3': '', '2-4': '',
      '4-4': '清明节', '4-5': '', '4-6': '',
      '5-1': '劳动节', '5-2': '', '5-3': '', '5-4': '', '5-5': '',
      '5-31': '端午节', '6-1': '', '6-2': '',
      '10-1': '国庆节·中秋节', '10-2': '', '10-3': '', '10-4': '', '10-5': '', '10-6': '', '10-7': '', '10-8': ''
    },
    makeup: ['1-26', '2-8', '4-27', '9-28', '10-11']
  },
  2026: {
    holidays: {
      '1-1': '元旦', '1-2': '', '1-3': '',
      '2-15': '春节', '2-16': '', '2-17': '', '2-18': '', '2-19': '', '2-20': '', '2-21': '', '2-22': '', '2-23': '',
      '4-4': '清明节', '4-5': '', '4-6': '',
      '5-1': '劳动节', '5-2': '', '5-3': '', '5-4': '', '5-5': '',
      '6-19': '端午节', '6-20': '', '6-21': '',
      '9-25': '中秋节', '9-26': '', '9-27': '',
      '10-1': '国庆节', '10-2': '', '10-3': '', '10-4': '', '10-5': '', '10-6': '', '10-7': ''
    },
    makeup: ['1-4', '2-14', '2-28', '5-9', '9-20', '10-10']
  }
};

// 获取某年节假日数据（优先内置库，可选在线刷新）
window.getHolidayYear = function (year) {
  return window.HOLIDAY_DB[year] || { holidays: {}, makeup: [] };
};

// 判断某日期的标记类型：'holiday'（放假） | 'makeup'（补班） | 'normal'（普通工作日）
// 返回 { type, name }，name 仅在节假日首日有值
window.getDayMark = function (date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = m + '-' + d;
  const data = window.getHolidayYear(y);
  if (data.holidays && key in data.holidays) {
    return { type: 'holiday', name: data.holidays[key] || '' };
  }
  if (data.makeup && data.makeup.indexOf(key) !== -1) {
    return { type: 'makeup', name: '' };
  }
  return { type: 'normal', name: '' };
};

// 尝试从在线 API 刷新某年数据（失败则静默回退到内置库）
window.refreshHolidayFromAPI = async function (year) {
  try {
    const res = await fetch('https://timor.tech/api/holiday/year/' + year);
    if (!res.ok) return false;
    const json = await res.json();
    if (json && json.code === 0 && json.data && json.data.list) {
      const holidays = {};
      const makeup = [];
      json.data.list.forEach(function (item) {
        const dt = new Date(item.date.replace(/-/g, '/'));
        const key = (dt.getMonth() + 1) + '-' + dt.getDate();
        if (item.type === 1 || item.type === 2) {
          // 1=法定节假日 2=节假日（周末顺延）
          if (!(key in holidays)) holidays[key] = item.name || '';
        } else if (item.type === 3) {
          // 3=调休补班
          makeup.push(key);
        }
      });
      window.HOLIDAY_DB[year] = { holidays: holidays, makeup: makeup };
      return true;
    }
  } catch (e) { /* 离线时忽略，使用内置库 */ }
  return false;
};
