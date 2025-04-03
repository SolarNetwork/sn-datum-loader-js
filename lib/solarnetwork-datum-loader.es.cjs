// https://github.com/SolarNetwork/sn-datum-loader-js Version 2.0.3. Copyright 2025 SolarNetwork Foundation.
'use strict';

// The Fetch API subset required by DatumLoader
var fetch$1 = fetch;

var fetch$2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: fetch$1
});

const t0 = new Date, t1 = new Date;

function timeInterval(floori, offseti, count, field) {

  function interval(date) {
    return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
  }

  interval.floor = (date) => {
    return floori(date = new Date(+date)), date;
  };

  interval.ceil = (date) => {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };

  interval.round = (date) => {
    const d0 = interval(date), d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };

  interval.offset = (date, step) => {
    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };

  interval.range = (start, stop, step) => {
    const range = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
    let previous;
    do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range;
  };

  interval.filter = (test) => {
    return timeInterval((date) => {
      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
    }, (date, step) => {
      if (date >= date) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
        } else while (--step >= 0) {
          while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
        }
      }
    });
  };

  if (count) {
    interval.count = (start, end) => {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };

    interval.every = (step) => {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null
          : !(step > 1) ? interval
          : interval.filter(field
              ? (d) => field(d) % step === 0
              : (d) => interval.count(0, d) % step === 0);
    };
  }

  return interval;
}

const durationSecond = 1000;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;

const timeDay = timeInterval(
  date => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
  date => date.getDate() - 1
);

timeDay.range;

const utcDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return date.getUTCDate() - 1;
});

utcDay.range;

const unixDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return Math.floor(date / durationDay);
});

unixDay.range;

function timeWeekday(i) {
  return timeInterval((date) => {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setDate(date.getDate() + step * 7);
  }, (start, end) => {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}

const timeSunday = timeWeekday(0);
const timeMonday = timeWeekday(1);
const timeTuesday = timeWeekday(2);
const timeWednesday = timeWeekday(3);
const timeThursday = timeWeekday(4);
const timeFriday = timeWeekday(5);
const timeSaturday = timeWeekday(6);

timeSunday.range;
timeMonday.range;
timeTuesday.range;
timeWednesday.range;
timeThursday.range;
timeFriday.range;
timeSaturday.range;

function utcWeekday(i) {
  return timeInterval((date) => {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, (start, end) => {
    return (end - start) / durationWeek;
  });
}

const utcSunday = utcWeekday(0);
const utcMonday = utcWeekday(1);
const utcTuesday = utcWeekday(2);
const utcWednesday = utcWeekday(3);
const utcThursday = utcWeekday(4);
const utcFriday = utcWeekday(5);
const utcSaturday = utcWeekday(6);

utcSunday.range;
utcMonday.range;
utcTuesday.range;
utcWednesday.range;
utcThursday.range;
utcFriday.range;
utcSaturday.range;

const timeYear = timeInterval((date) => {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setFullYear(date.getFullYear() + step);
}, (start, end) => {
  return end.getFullYear() - start.getFullYear();
}, (date) => {
  return date.getFullYear();
});

// An optimized implementation for this simple case.
timeYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setFullYear(date.getFullYear() + step * k);
  });
};

timeYear.range;

const utcYear = timeInterval((date) => {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, (start, end) => {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, (date) => {
  return date.getUTCFullYear();
});

// An optimized implementation for this simple case.
utcYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};

utcYear.range;

function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date.setFullYear(d.y);
    return date;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}

function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date.setUTCFullYear(d.y);
    return date;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}

function newDate(y, m, d) {
  return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
}

function formatLocale(locale) {
  var locale_dateTime = locale.dateTime,
      locale_date = locale.date,
      locale_time = locale.time,
      locale_periods = locale.periods,
      locale_weekdays = locale.days,
      locale_shortWeekdays = locale.shortDays,
      locale_months = locale.months,
      locale_shortMonths = locale.shortMonths;

  var periodRe = formatRe(locale_periods),
      periodLookup = formatLookup(locale_periods),
      weekdayRe = formatRe(locale_weekdays),
      weekdayLookup = formatLookup(locale_weekdays),
      shortWeekdayRe = formatRe(locale_shortWeekdays),
      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
      monthRe = formatRe(locale_months),
      monthLookup = formatLookup(locale_months),
      shortMonthRe = formatRe(locale_shortMonths),
      shortMonthLookup = formatLookup(locale_shortMonths);

  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "g": formatYearISO,
    "G": formatFullYearISO,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "q": formatQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };

  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "g": formatUTCYearISO,
    "G": formatUTCFullYearISO,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "q": formatUTCQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };

  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "g": parseYear,
    "G": parseFullYear,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "q": parseQuarter,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };

  // These recursive directive definitions must be deferred.
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);

  function newFormat(specifier, formats) {
    return function(date) {
      var string = [],
          i = -1,
          j = 0,
          n = specifier.length,
          c,
          pad,
          format;

      if (!(date instanceof Date)) date = new Date(+date);

      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad = c === "e" ? " " : "0";
          if (format = formats[c]) c = format(date, pad);
          string.push(c);
          j = i + 1;
        }
      }

      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }

  function newParse(specifier, Z) {
    return function(string) {
      var d = newDate(1900, undefined, 1),
          i = parseSpecifier(d, specifier, string += "", 0),
          week, day;
      if (i != string.length) return null;

      // If a UNIX timestamp is specified, return it.
      if ("Q" in d) return new Date(d.Q);
      if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

      // If this is utcParse, never use the local timezone.
      if (Z && !("Z" in d)) d.Z = 0;

      // The am-pm flag is 0 for AM, and 1 for PM.
      if ("p" in d) d.H = d.H % 12 + d.p * 12;

      // If the month was not specified, inherit from the quarter.
      if (d.m === undefined) d.m = "q" in d ? d.q : 0;

      // Convert day-of-week and week-of-year to day-of-year.
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
          week = day > 4 || day === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
          week = day > 4 || day === 0 ? timeMonday.ceil(week) : timeMonday(week);
          week = timeDay.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
      }

      // If a time zone is specified, all fields are interpreted as UTC and then
      // offset according to the specified time zone.
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }

      // Otherwise, all fields are in local time.
      return localDate(d);
    };
  }

  function parseSpecifier(d, specifier, string, j) {
    var i = 0,
        n = specifier.length,
        m = string.length,
        c,
        parse;

    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }

    return j;
  }

  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }

  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }

  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }

  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }

  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }

  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }

  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }

  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }

  function formatQuarter(d) {
    return 1 + ~~(d.getMonth() / 3);
  }

  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }

  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }

  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }

  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }

  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }

  function formatUTCQuarter(d) {
    return 1 + ~~(d.getUTCMonth() / 3);
  }

  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() { return specifier; };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", false);
      p.toString = function() { return specifier; };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() { return specifier; };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier += "", true);
      p.toString = function() { return specifier; };
      return p;
    }
  };
}

var pads = {"-": "", "_": " ", "0": "0"},
    numberRe = /^\s*\d+/, // note: ignores next directive
    percentRe = /^%/,
    requoteRe = /[\\^$*+?|[\]().{}]/g;

function pad(value, fill, width) {
  var sign = value < 0 ? "-" : "",
      string = (sign ? -value : value) + "",
      length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}

function requote(s) {
  return s.replace(requoteRe, "\\$&");
}

function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}

function formatLookup(names) {
  return new Map(names.map((name, i) => [name.toLowerCase(), i]));
}

function parseWeekdayNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}

function parseWeekdayNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberISO(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}

function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}

function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
}

function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}

function parseQuarter(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
}

function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}

function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}

function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}

function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}

function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}

function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}

function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}

function parseMicroseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
}

function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}

function parseUnixTimestamp(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}

function parseUnixTimestampSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.s = +n[0], i + n[0].length) : -1;
}

function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}

function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}

function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}

function formatDayOfYear(d, p) {
  return pad(1 + timeDay.count(timeYear(d), d), p, 3);
}

function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}

function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}

function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}

function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}

function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}

function formatWeekdayNumberMonday(d) {
  var day = d.getDay();
  return day === 0 ? 7 : day;
}

function formatWeekNumberSunday(d, p) {
  return pad(timeSunday.count(timeYear(d) - 1, d), p, 2);
}

function dISO(d) {
  var day = d.getDay();
  return (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
}

function formatWeekNumberISO(d, p) {
  d = dISO(d);
  return pad(timeThursday.count(timeYear(d), d) + (timeYear(d).getDay() === 4), p, 2);
}

function formatWeekdayNumberSunday(d) {
  return d.getDay();
}

function formatWeekNumberMonday(d, p) {
  return pad(timeMonday.count(timeYear(d) - 1, d), p, 2);
}

function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}

function formatYearISO(d, p) {
  d = dISO(d);
  return pad(d.getFullYear() % 100, p, 2);
}

function formatFullYear(d, p) {
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatFullYearISO(d, p) {
  var day = d.getDay();
  d = (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+"))
      + pad(z / 60 | 0, "0", 2)
      + pad(z % 60, "0", 2);
}

function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}

function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}

function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}

function formatUTCDayOfYear(d, p) {
  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
}

function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}

function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}

function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}

function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}

function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}

function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function formatUTCWeekNumberSunday(d, p) {
  return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
}

function UTCdISO(d) {
  var day = d.getUTCDay();
  return (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
}

function formatUTCWeekNumberISO(d, p) {
  d = UTCdISO(d);
  return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}

function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}

function formatUTCWeekNumberMonday(d, p) {
  return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
}

function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCYearISO(d, p) {
  d = UTCdISO(d);
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCFullYearISO(d, p) {
  var day = d.getUTCDay();
  d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCZone() {
  return "+0000";
}

function formatLiteralPercent() {
  return "%";
}

function formatUnixTimestamp(d) {
  return +d;
}

function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1000);
}

var locale;
var timeFormat;
var utcFormat;
var utcParse;

defaultLocale({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  timeFormat = locale.format;
  locale.parse;
  utcFormat = locale.utcFormat;
  utcParse = locale.utcParse;
  return locale;
}

/**
 * An enumerated object base class.
 *
 * @typeParam T the enum type
 * @public
 */
class Enum {
    #name;
    /**
     * Constructor.
     *
     * @param name - the name
     */
    constructor(name) {
        this.#name = name;
    }
    /**
     * Get the enum name.
     *
     * @returns the name
     */
    get name() {
        return this.#name;
    }
    /**
     * Test if a string is equal to this enum's name.
     *
     * As long as enum values are consistently obtained from the {@link Util.Enum.enumValues}
     * array then enum instances can be compared with `===`. If unsure, this method can be used
     * to compare string values instead.
     *
     * If `value` is passed as an actual Enum instance, then if that enum is the same class
     * as this enum it's `name` is compared to this instance's `name`.
     *
     * @param value - the value to test
     * @returns `true` if `value` is the same as this instance's `name` value
     */
    equals(value) {
        if (value && this.constructor === value.constructor) {
            return value.#name === this.#name;
        }
        return value === this.#name;
    }
    /**
     * Get all enum values.
     *
     * This method must be overridden by subclasses to return something meaningful.
     * This implementation returns an empty array.
     *
     * @abstract
     * @returns all enum values
     */
    static enumValues() {
        return [];
    }
    /**
     * This method takes an array of enums and turns them into a mapped object, using the enum
     * `name` as object property names.
     *
     * @param enums - the enum list to turn into a value object
     * @returns an object with enum `name` properties with associated enum values
     */
    static enumsValue(enums) {
        return Object.freeze(enums.reduce((obj, e) => {
            obj[e.name] = e;
            return obj;
        }, {}));
    }
    /**
     * Get an enum instance from its name.
     *
     * This method searches the {@link Util.Enum.enumValues} array for a matching value.
     *
     * @param name - the enum name to get an instnace for
     * @returns the instance, or `undefined` if no instance exists for the given `name`
     */
    static valueOf(name) {
        const enums = this.enumValues();
        if (!Array.isArray(enums)) {
            return undefined;
        }
        for (let i = 0, len = enums.length; i < len; i += 1) {
            if (name === enums[i].name) {
                return enums[i];
            }
        }
        return undefined;
    }
    /**
     * Get the names of a set of `Enum` instances.
     *
     * @param set - the set of `Enum` instances to get the names of
     * @returns array of `Enum` name values
     */
    static namesFor(set) {
        const result = [];
        if (set) {
            for (const e of set) {
                result.push(e.name);
            }
        }
        return result;
    }
}

/**
 * An immutable enum-like object with an associated comparable value.
 *
 * This class must be extended by another class that overrides the inerited
 * {@link Util.Enum.enumValues} method.
 *
 * @abstract
 */
class ComparableEnum extends Enum {
    #value;
    /**
     * Constructor.
     *
     * @param name - the name
     * @param value - the comparable value
     */
    constructor(name, value) {
        super(name);
        this.#value = value;
    }
    /**
     * Get the comparable value.
     *
     * @returns the value
     */
    get value() {
        return this.#value;
    }
    /**
     * Compare two ComparableEnum objects based on their `value` values.
     *
     * @param o - the object to compare to
     * @returns negative value, zero, or positive value if this instance is less than, equal to, or greater than `o`
     */
    compareTo(o) {
        if (this === o) {
            return 0;
        }
        else if (!o) {
            return 1;
        }
        return this.#value < o.#value ? -1 : this.#value > o.#value ? 1 : 0;
    }
    /**
     * Compute a complete set of enum values based on a minimum enum and/or set of enums.
     *
     * If `cache` is provided, then results computed via `minAggregation`
     * will be cached there, and subsequent calls will returned the cached result when appropriate.
     *
     * @param minEnum - a minimum enum value
     * @param cache - a cache of computed values
     * @returns the computed set, or `undefined` if no values match
     */
    static minimumEnumSet(minEnum, cache) {
        if (!minEnum) {
            return undefined;
        }
        let result = cache ? cache.get(minEnum.name) : undefined;
        if (result) {
            return result;
        }
        result = new Set();
        for (const agg of minEnum.constructor.enumValues()) {
            if (agg.compareTo(minEnum) > -1) {
                result.add(agg);
            }
        }
        if (cache) {
            cache.set(minEnum.name, result);
        }
        return result.size > 0 ? result : undefined;
    }
}

/**
 * An enumeration of supported aggregation names.
 */
var AggregationNames;
(function (AggregationNames) {
    /** One minute. */
    AggregationNames["Minute"] = "Minute";
    /** Five minute. */
    AggregationNames["FiveMinute"] = "FiveMinute";
    /** Ten minutes. */
    AggregationNames["TenMinute"] = "TenMinute";
    /** Fifteen minutes. */
    AggregationNames["FifteenMinute"] = "FifteenMinute";
    /** Thirty minutes. */
    AggregationNames["ThirtyMinute"] = "ThirtyMinute";
    /** One hour. */
    AggregationNames["Hour"] = "Hour";
    /** An hour of a day, from 1 to 24. */
    AggregationNames["HourOfDay"] = "HourOfDay";
    /** An hour of a day, further grouped into 4 yearly seasons. */
    AggregationNames["SeasonalHourOfDay"] = "SeasonalHourOfDay";
    /** A day. */
    AggregationNames["Day"] = "Day";
    /** A day of the week, from Monday - Sunday. */
    AggregationNames["DayOfWeek"] = "DayOfWeek";
    /** A day of the week, further grouped into 4 yearly seasons. */
    AggregationNames["SeasonalDayOfWeek"] = "SeasonalDayOfWeek";
    /** A week. */
    AggregationNames["Week"] = "Week";
    /** The week within a year, from 1 to 52. */
    AggregationNames["WeekOfYear"] = "WeekOfYear";
    /** A month. */
    AggregationNames["Month"] = "Month";
    /** A year. */
    AggregationNames["Year"] = "Year";
    /** A complete running total over a time span. */
    AggregationNames["RunningTotal"] = "RunningTotal";
})(AggregationNames || (AggregationNames = {}));
/**
 * A named aggregation.
 */
class Aggregation extends ComparableEnum {
    /**
     * Constructor.
     *
     * @param name - the unique name for this precision
     * @param level - a relative aggregation level value
     */
    constructor(name, level) {
        super(name, level);
        if (this.constructor === Aggregation) {
            Object.freeze(this);
        }
    }
    /**
     * Get the aggregate level value.
     *
     * This is an alias for {@link Util.ComparableEnum#value}.
     */
    get level() {
        return this.value;
    }
    /**
     * @override
     * @inheritdoc
     */
    static enumValues() {
        return AggregationValues;
    }
}
/**
 * The aggregation enum values array.
 */
const AggregationValues = Object.freeze([
    new Aggregation(AggregationNames.Minute, 60),
    new Aggregation(AggregationNames.FiveMinute, 60 * 5),
    new Aggregation(AggregationNames.TenMinute, 60 * 10),
    new Aggregation(AggregationNames.FifteenMinute, 60 * 15),
    new Aggregation(AggregationNames.ThirtyMinute, 60 * 30),
    new Aggregation(AggregationNames.Hour, 3600),
    new Aggregation(AggregationNames.HourOfDay, 3600),
    new Aggregation(AggregationNames.SeasonalHourOfDay, 3600),
    new Aggregation(AggregationNames.Day, 86400),
    new Aggregation(AggregationNames.DayOfWeek, 86400),
    new Aggregation(AggregationNames.SeasonalDayOfWeek, 86400),
    new Aggregation(AggregationNames.Week, 604800),
    new Aggregation(AggregationNames.WeekOfYear, 604800),
    new Aggregation(AggregationNames.Month, 2419200),
    new Aggregation(AggregationNames.Year, 31536000),
    new Aggregation(AggregationNames.RunningTotal, Number.MAX_SAFE_INTEGER),
]);
/**
 * The supported Aggregation values as an object mapping.
 *
 * Use this object like:
 *
 * ```
 * import Aggregations from "solarnetwork-api-core";
 *
 * const hourly = Aggregations.Hour;
 * ```
 *
 * @see {@link Domain.AggregationNames} for the available values
 */
Aggregation.enumsValue(AggregationValues);

/**
 * Format a date into a SolarNet UTC timestamp format: `yyyy-MM-dd HH:mm:ss.SSS'Z'`.
 */
utcFormat("%Y-%m-%d %H:%M:%S.%LZ");
/**
 * Format a date into a SolarNet UTC date/time format: `yyyy-MM-dd HH:mm`.
 */
utcFormat("%Y-%m-%d %H:%M");
/**
 * Format a date into a SolarNet URL UTC date/time format: `yyyy-MM-dd'T'HH:mm`.
 */
const dateTimeUrlFormat = utcFormat("%Y-%m-%dT%H:%M");
/**
 * Format a date into a SolarNet URL UTC date/time format: `yyyy-MM-dd'T'HH:mm`
 * or ``yyyy-MM-dd` if both the hours and minutes of the date are zero.
 * @param date the date to format
 * @returns the formatted date
 */
const dateUrlFormat = (date) => {
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
        return dateFormat(date);
    }
    return dateTimeUrlFormat(date);
};
/**
 * Format a date into a SolarNet URL local date/time format: `yyyy-MM-dd'T'HH:mm`.
 */
const localDateTimeUrlFormat = timeFormat("%Y-%m-%dT%H:%M");
/**
 * Format a date into a SolarNet URL local date/time format: `yyyy-MM-dd'T'HH:mm`
 * or ``yyyy-MM-dd` if both the hours and minutes of the date are zero.
 * @param date the date to format
 * @returns the formatted date
 */
const localDateUrlFormat = (date) => {
    if (date.getHours() === 0 && date.getMinutes() === 0) {
        return localDateFormat(date);
    }
    return localDateTimeUrlFormat(date);
};
/**
 * Format a date into a SolarNet UTC date format: `yyyy-MM-dd`.
 */
const dateFormat = utcFormat("%Y-%m-%d");
/**
 * Format a local date into a SolarNet date format: `yyyy-MM-dd`.
 */
const localDateFormat = timeFormat("%Y-%m-%d");
/**
 * Parse a SolarNet UTC timestamp value:  `yyyy-MM-dd HH:mm:ss.SSS'Z'.
 */
utcParse("%Y-%m-%d %H:%M:%S.%LZ");
/**
 * Parse a SolarNet UTC date/time: `yyyy-MM-dd HH:mm.
 */
utcParse("%Y-%m-%d %H:%M");
/**
 * Parse a SolarNet URL UTC date/time: `yyyy-MM-dd'T'HH:mm`.
 */
utcParse("%Y-%m-%dT%H:%M");
/**
 * Parse a SolarNet UTC date value: `yyyy-MM-dd`.
 */
utcParse("%Y-%m-%d");

/**
 * A case-insensitive, case-preserving string key multi-value map object.
 *
 * This map supports `null` values but ignores attempts to add keys with `undefined` values.
 */
class MultiMap {
    /** Mapping of lower-case header names to {key:X, val:[]} values. */
    #mappings;
    /** List of mappings to maintain insertion order. */
    #mappingNames;
    /**
     * Constructor.
     *
     * @param values - an object who's enumerable properties will be added to this map
     */
    constructor(values) {
        this.#mappings = {};
        this.#mappingNames = [];
        if (values) {
            this.putAll(values);
        }
    }
    /**
     * Add/replace values on a map.
     *
     * @param key - the key to change
     * @param value - the value to add; if `undefined` then nothing will be added
     * @param replace - if `true` then replace all existing values;
     *     if `false` append to any existing values
     * @returns this object
     */
    #addValue(key, value, replace) {
        if (value === undefined) {
            return this;
        }
        const keyLc = key.toLowerCase();
        let mapping = this.#mappings[keyLc];
        if (!mapping) {
            mapping = { key: key, val: [] };
            this.#mappings[keyLc] = mapping;
            this.#mappingNames.push(keyLc);
        }
        if (replace) {
            mapping.val.length = 0;
        }
        if (Array.isArray(value)) {
            const len = value.length;
            for (let i = 0; i < len; i += 1) {
                mapping.val.push(value[i]);
            }
        }
        else {
            mapping.val.push(value);
        }
        return this;
    }
    /**
     * Add a value.
     *
     * This method will append values to existing keys.
     *
     * @param key - the key to use
     * @param value - the value to add; if `undefined` nothing will be added
     */
    add(key, value) {
        return this.#addValue(key, value);
    }
    /**
     * Set a value.
     *
     * This method will replace any existing values with just `value`.
     *
     * @param key - the key to use
     * @param value - the value to set; if `undefined` nothing will be added
     * @returns this object
     */
    put(key, value) {
        return this.#addValue(key, value, true);
    }
    /**
     * Set multiple values.
     *
     * This method will replace any existing values with those provided on `values`.
     *
     * @param values - an object who's enumerable properties will be added to this map
     * @returns this object
     */
    putAll(values) {
        for (const key in values) {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                this.#addValue(key, values[key], true);
            }
        }
        return this;
    }
    /**
     * Get the values associated with a key.
     *
     * @param key - the key of the values to get
     * @returns the array of values associated with the key, or `undefined` if not available
     */
    value(key) {
        const keyLc = key.toLowerCase();
        const mapping = this.#mappings[keyLc];
        return mapping ? mapping.val : undefined;
    }
    /**
     * Get the first avaialble value assocaited with a key.
     *
     * @param key - the key of the value to get
     * @returns the first available value associated with the key, or `undefined` if not available
     */
    firstValue(key) {
        const values = this.value(key);
        return values && values.length > 0 ? values[0] : undefined;
    }
    /**
     * Remove all properties from this map.
     *
     * @returns this object
     */
    clear() {
        this.#mappingNames.length = 0;
        this.#mappings = {};
        return this;
    }
    /**
     * Remove all values associated with a key.
     *
     * @param key - the key of the values to remove
     * @returns the removed values, or `undefined` if no values were present for the given key
     */
    remove(key) {
        const keyLc = key.toLowerCase();
        const index = this.#mappingNames.indexOf(keyLc);
        const result = this.#mappings[keyLc];
        if (result) {
            delete this.#mappings[keyLc];
            this.#mappingNames.splice(index, 1);
        }
        return result ? result.val : undefined;
    }
    /**
     * Get the number of entries in this map.
     *
     * @returns the number of entries in the map
     */
    size() {
        return this.#mappingNames.length;
    }
    /**
     * Test if the map is empty.
     *
     * @returns `true` if there are no entries in this map
     */
    isEmpty() {
        return this.size() < 1;
    }
    /**
     * Test if there are any values associated with a key.
     *
     * @param key - the key to test
     * @returns `true` if there is at least one value associated with the key
     */
    containsKey(key) {
        return this.value(key) !== undefined;
    }
    /**
     * Get an array of all keys in this map.
     *
     * @returns array of keys in this map, or an empty array if the map is empty
     */
    keySet() {
        const result = [];
        const len = this.size();
        for (let i = 0; i < len; i += 1) {
            result.push(this.#mappings[this.#mappingNames[i]].key);
        }
        return result;
    }
}

/**
 * A pagination criteria object.
 */
class Pagination {
    #max;
    #offset;
    /**
     * Construct a pagination object.
     *
     * @param max - the maximum number of results to return
     * @param offset - the 0-based starting offset
     */
    constructor(max, offset) {
        this.#max = max !== undefined && max > 0 ? +max : 0;
        this.#offset = offset !== undefined && offset > 0 ? +offset : 0;
    }
    /**
     * Get the maximum number of results to return.
     *
     * @returns the maximum number of results
     */
    get max() {
        return this.#max;
    }
    /**
     * Get the results starting offset.
     *
     * The first available result starts at offset <code>0</code>. Note this is
     * a raw offset value, not a "page" offset.
     *
     * @returns the starting result offset
     */
    get offset() {
        return this.#offset;
    }
    /**
     * Copy constructor with a new `offset` value.
     *
     * @param offset the new offset to use
     * @returns a new instance
     */
    withOffset(offset) {
        return new Pagination(this.#max, offset);
    }
    /**
     * Get this object as a standard URI encoded (query parameters) string value.
     *
     * @returns the URI encoded string
     */
    toUriEncoding() {
        let result = "";
        if (this.max > 0) {
            result += "max=" + this.max;
        }
        if (this.offset > 0) {
            if (result.length > 0) {
                result += "&";
            }
            result += "offset=" + this.offset;
        }
        return result;
    }
}

/**
 * A description of a sort applied to a property of a collection.
 */
class SortDescriptor {
    #key;
    #descending;
    /**
     * Constructor.
     *
     * @param key - the property to sort on
     * @param descending - `true` to sort in descending order, `false` for ascending
     */
    constructor(key, descending) {
        this.#key = key;
        this.#descending = !!descending;
    }
    /**
     * Get the sort property name.
     *
     * @returns the sort key
     */
    get key() {
        return this.#key;
    }
    /**
     * Get the sorting direction.
     *
     * @returns `true` if descending order, `false` for ascending
     */
    get descending() {
        return this.#descending;
    }
    /**
     * Get this object as a standard URI encoded (query parameters) string value.
     *
     * If `index` is provided and non-negative, then the query parameters will
     * be encoded as an array property named `propertyName`. Otherwise just
     * bare `key` and `descending` properties will be used. The
     * `descending` property is only added if it is `true`.
     *
     * @param index - an optional array property index
     * @param propertyName - an optional array property name, only used if `index` is also provided;
     *                       defaults to `sorts`
     * @return the URI encoded string
     */
    toUriEncoding(index, propertyName) {
        const propName = propertyName || "sorts";
        let result;
        if (index !== undefined && index >= 0) {
            result = encodeURIComponent(propName + "[" + index + "].key") + "=";
        }
        else {
            result = "key=";
        }
        result += encodeURIComponent(this.key);
        if (this.descending) {
            if (index !== undefined && index >= 0) {
                result +=
                    "&" +
                        encodeURIComponent(propName + "[" + index + "].descending") +
                        "=true";
            }
            else {
                result += "&descending=true";
            }
        }
        return result;
    }
}

/**
 * A basic map-like object.
 *
 * This object includes some utility functions that make it well suited to using
 * as an API query object. For example, the {@link Util.PropMap.toUriEncoding}
 * method provides a way to serialize this object into URL query parameters.
 */
class PropMap {
    /**
     * The object that all properties are stored on.
     */
    props;
    /**
     * Constructor.
     * @param props the initial properties; if a `PropMap` instance is provided, the properties
     *     of that object will be copied into this one; otherwise the object will be
     *     used directly to hold property values
     */
    constructor(props) {
        this.props =
            props instanceof PropMap
                ? new Map(props.props)
                : props instanceof Map
                    ? new Map(props)
                    : typeof props === "object"
                        ? new Map(Object.entries(props))
                        : new Map();
    }
    /**
     * Get an iterator over the property entries.
     * @returns iterator over `[k, v]` values
     */
    [Symbol.iterator]() {
        return this.props[Symbol.iterator]();
    }
    /**
     * Get the number of properties configured.
     */
    get size() {
        return this.props.size;
    }
    prop(key, newValue) {
        if (newValue === undefined) {
            return this.props.get(key);
        }
        if (newValue === null) {
            this.props.delete(key);
        }
        else {
            this.props.set(key, newValue);
        }
        return this;
    }
    properties(newProps) {
        if (newProps) {
            for (const [k, v] of newProps instanceof Map
                ? newProps
                : Object.entries(newProps)) {
                this.prop(k, v);
            }
            return this;
        }
        return Object.fromEntries(this.props.entries());
    }
    /**
     * Get this object as a standard URI encoded (query parameters) string value.
     *
     * All enumerable properties of the <code>props</code> property will be added to the
     * result. If any property value is an array, the values of the array will be joined
     * by a comma. Any {@link Util.Enum} values will have their `name` property used.
     *
     * @param propertyName - an optional object property prefix to add to all properties
     * @param callbackFn - An optional function that will be called for each property.
     *                   The function will be passed property name and value arguments, and must
     *                   return either `undefined` to skip the property, a 2 or 3-element array with the
     *                   property name and value to use, and an optional boolean to force array
     *                   values to use mutliple parameter keys. Any other return value causes the
     *                   property to be used as-is.
     * @return the URI encoded string
     */
    toUriEncoding(propertyName, callbackFn) {
        let result = "";
        for (let [k, v] of this.props) {
            let forceMultiKey = false;
            if (callbackFn) {
                const kv = callbackFn(k, v);
                if (kv === undefined || kv === null) {
                    continue;
                }
                else if (Array.isArray(kv) && kv.length > 1) {
                    k = kv[0];
                    v = kv[1];
                    if (kv.length > 2) {
                        forceMultiKey = !!kv[2];
                    }
                }
            }
            if (result.length > 0) {
                result += "&";
            }
            if (v instanceof PropMap) {
                result += v.toUriEncoding(propertyName
                    ? encodeURIComponent(propertyName) + "." + k
                    : k, callbackFn);
                continue;
            }
            if (propertyName) {
                result += encodeURIComponent(propertyName) + ".";
            }
            result += encodeURIComponent(k) + "=";
            if (Array.isArray(v)) {
                v.forEach(function (e, i) {
                    if (i > 0) {
                        result += forceMultiKey
                            ? "&" + encodeURIComponent(k) + "="
                            : ",";
                    }
                    if (e instanceof Enum) {
                        e = e.name;
                    }
                    result += encodeURIComponent(e);
                });
            }
            else {
                if (v instanceof Enum) {
                    v = v.name;
                }
                result += encodeURIComponent(v);
            }
        }
        return result;
    }
    /**
     * Get this object as a standard URI encoded (query parameters) string value with
     * sorting and pagination parameters.
     *
     * This calls {@link Util.PropMap.toUriEncoding} first, then encodes
     * the `sorts` and `pagination` parameters, if provided.
     *
     * @param sorts - optional sort settings to use
     * @param pagination - optional pagination settings to use
     * @param propertyName - an optional object property prefix to add to all properties
     * @param callbackFn - An optional function that will be called for each property.
     *                   The function will be passed property name and value arguments, and must
     *                   return either `undefined` to skip the property, a 2-element array with the property
     *                   name and value to use, or anything else to use the property as-is.
     * @return the URI encoded string
     */
    toUriEncodingWithSorting(sorts, pagination, propertyName, callbackFn) {
        let params = this.toUriEncoding(propertyName, callbackFn);
        if (Array.isArray(sorts)) {
            sorts.forEach((sort, i) => {
                if (sort instanceof SortDescriptor) {
                    if (params.length > 0) {
                        params += "&";
                    }
                    params += sort.toUriEncoding(i);
                }
            });
        }
        if (pagination instanceof Pagination) {
            const paginationParams = pagination.toUriEncoding();
            if (paginationParams) {
                if (params.length > 0) {
                    params += "&";
                }
                params += paginationParams;
            }
        }
        return params;
    }
}

/**
 * Enumeration of HTTP methods (verbs).
 */
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "GET";
    HttpMethod["HEAD"] = "HEAD";
    HttpMethod["POST"] = "POST";
    HttpMethod["PUT"] = "PUT";
    HttpMethod["PATCH"] = "PATCH";
    HttpMethod["DELETE"] = "DELETE";
    HttpMethod["OPTIONS"] = "OPTIONS";
    HttpMethod["TRACE"] = "TRACE";
})(HttpMethod || (HttpMethod = {}));
/**
 * Enumeration of common HTTP `Content-Type` values.
 */
var HttpContentType;
(function (HttpContentType) {
    /** JSON type. */
    HttpContentType["APPLICATION_JSON"] = "application/json";
    /** JSON type with UTF-8 charset type. */
    HttpContentType["APPLICATION_JSON_UTF8"] = "application/json; charset=UTF-8";
    /** Form URL-encoded type. */
    HttpContentType["FORM_URLENCODED"] = "application/x-www-form-urlencoded";
    /** Form URL-encoded with UTF-8 charset type. */
    HttpContentType["FORM_URLENCODED_UTF8"] = "application/x-www-form-urlencoded; charset=UTF-8";
})(HttpContentType || (HttpContentType = {}));
/**
 * HTTP headers multi-map.
 */
class HttpHeaders extends MultiMap {
    /**  The `Accept` header. */
    static ACCEPT = "Accept";
    /** The `Authorization` header. */
    static AUTHORIZATION = "Authorization";
    /** The `Content-MD5` header. */
    static CONTENT_MD5 = "Content-MD5";
    /** The `Content-Type` header. */
    static CONTENT_TYPE = "Content-Type";
    /** The `Date` header.  */
    static DATE = "Date";
    /** The `Digest` header. */
    static DIGEST = "Digest";
    /** The `Host` header.  */
    static HOST = "Host";
    /**  The `X-SN-Date` header. */
    static X_SN_DATE = "X-SN-Date";
}

/**
 * Parse the query portion of a URL string, and return a parameter object for the
 * parsed key/value pairs.
 *
 * Multiple parameters of the same name will be stored as an array on the returned object.
 *
 * @param search - the query portion of the URL, which may optionally include the leading `?` character
 * @param multiValueKeys - if provided, a set of keys for which to always treat
 *                                       as a multi-value array, even if there is only one value
 * @return the parsed query parameters, as a parameter object
 */
/**
 * Encode the properties of an object as a URL query string.
 *
 * If an object property has an array value, multiple URL parameters will be encoded for that property.
 *
 * The optional `encoderFn` argument is a function that accepts a string value
 * and should return a URI-safe string for that value.
 *
 * @param parameters - an object to encode as URL parameters
 * @param encoderFn - an optional function to encode each URI component with;
 *     if not provided the built-in `encodeURIComponent()` function will be used
 * @return the encoded query parameters
 */
function urlQueryEncode(parameters, encoderFn) {
    let result = "";
    const encoder = encodeURIComponent;
    function handleValue(k, v) {
        if (result.length) {
            result += "&";
        }
        result += encoder(k) + "=" + encoder(v);
    }
    if (parameters) {
        for (const prop in parameters) {
            if (Object.prototype.hasOwnProperty.call(parameters, prop)) {
                const val = parameters[prop];
                if (Array.isArray(val)) {
                    for (let i = 0, len = val.length; i < len; i++) {
                        handleValue(prop, val[i]);
                    }
                }
                else {
                    handleValue(prop, val);
                }
            }
        }
    }
    return result;
}

/**
 * An enumeration of supported combining type names.
 */
var CombiningTypeNames;
(function (CombiningTypeNames) {
    /** Average. */
    CombiningTypeNames["Average"] = "Average";
    /** Sum. */
    CombiningTypeNames["Sum"] = "Sum";
    /** Difference; note the order of mapped IDs is significant. */
    CombiningTypeNames["Difference"] = "Difference";
})(CombiningTypeNames || (CombiningTypeNames = {}));
/**
 * A named query combining action type.
 */
class CombiningType extends Enum {
    /**
     * Constructor.
     *
     * @param name - the unique name for this type
     */
    constructor(name) {
        super(name);
        if (this.constructor === CombiningType) {
            Object.freeze(this);
        }
    }
    /**
     * @override
     * @inheritdoc
     */
    static enumValues() {
        return CombiningTypeValues;
    }
}
/**
 * The combining type enum values array.
 */
const CombiningTypeValues = Object.freeze([
    new CombiningType(CombiningTypeNames.Average),
    new CombiningType(CombiningTypeNames.Sum),
    new CombiningType(CombiningTypeNames.Difference),
]);
/**
 * The enumeration of supported CombiningType values.
 * @see {@link Domain.CombiningTypeNames} for the available values
 */
CombiningType.enumsValue(CombiningTypeValues);

/** An enumeration of location property keys. */
var LocationKeys;
(function (LocationKeys) {
    LocationKeys["Country"] = "country";
    LocationKeys["Elevation"] = "elevation";
    LocationKeys["Latitude"] = "latitude";
    LocationKeys["ID"] = "id";
    LocationKeys["Locality"] = "locality";
    LocationKeys["Longitude"] = "longitude";
    LocationKeys["Name"] = "name";
    LocationKeys["PostalCode"] = "postalCode";
    LocationKeys["Region"] = "region";
    LocationKeys["StateOrProvince"] = "stateOrProvince";
    LocationKeys["Street"] = "street";
    LocationKeys["TimeZoneId"] = "timeZoneId";
})(LocationKeys || (LocationKeys = {}));
/** Sorted list of all location key values. */
const LocationPropertyNames = Object.values(LocationKeys).sort();
/** A set of location key values. */
new Set(LocationPropertyNames);
/**
 * A geographic location.
 */
class Location extends PropMap {
    /**
     * Constructor.
     *
     * @param loc - the location to copy properties from
     */
    constructor(loc) {
        super(loc);
    }
    /**
     * A SolarNetwork assigned unique identifier.
     */
    get id() {
        return this.prop(LocationKeys.ID);
    }
    set id(val) {
        this.prop(LocationKeys.ID, val);
    }
    /**
     * A generalized name, can be used for "virtual" locations.
     */
    get name() {
        return this.prop(LocationKeys.Name);
    }
    set name(val) {
        this.prop(LocationKeys.Name, val);
    }
    /**
     * An ISO 3166-1 alpha-2 character country code.
     */
    get country() {
        return this.prop(LocationKeys.Country);
    }
    set country(val) {
        this.prop(LocationKeys.Country, val);
    }
    /**
     * A country-specific regional identifier.
     */
    get region() {
        return this.prop(LocationKeys.Region);
    }
    set region(val) {
        this.prop(LocationKeys.Region, val);
    }
    /**
     * A country-specific state or province identifier.
     */
    get stateOrProvince() {
        return this.prop(LocationKeys.StateOrProvince);
    }
    set stateOrProvince(val) {
        this.prop(LocationKeys.StateOrProvince, val);
    }
    /**
     * Get the locality (city, town).
     */
    get locality() {
        return this.prop(LocationKeys.Locality);
    }
    set locality(val) {
        this.prop(LocationKeys.Locality, val);
    }
    /**
     * A country-specific postal code.
     */
    get postalCode() {
        return this.prop(LocationKeys.PostalCode);
    }
    set postalCode(val) {
        this.prop(LocationKeys.PostalCode, val);
    }
    /**
     * The street address.
     */
    get street() {
        return this.prop(LocationKeys.Street);
    }
    set street(val) {
        this.prop(LocationKeys.Street, val);
    }
    /**
     * The decimal world latitude.
     */
    get latitude() {
        return this.prop(LocationKeys.Latitude);
    }
    set latitude(val) {
        this.prop(LocationKeys.Latitude, val);
    }
    /**
     * The decimal world longitude.
     */
    get longitude() {
        return this.prop(LocationKeys.Longitude);
    }
    set longitude(val) {
        this.prop(LocationKeys.Longitude, val);
    }
    /**
     * The elevation above sea level, in meters.
     */
    get elevation() {
        return this.prop(LocationKeys.Elevation);
    }
    set elevation(val) {
        this.prop(LocationKeys.Elevation, val);
    }
    /**
     * A time zone ID, for example `Pacific/Auckland`.
     */
    get timeZoneId() {
        return this.prop(LocationKeys.TimeZoneId);
    }
    set timeZoneId(val) {
        this.prop(LocationKeys.TimeZoneId, val);
    }
}

/** An enumeration of datum filter keys. */
var DatumFilterKeys;
(function (DatumFilterKeys) {
    DatumFilterKeys["AccumulatingPropertyName"] = "accumulatingPropertyName";
    DatumFilterKeys["AccumulatingPropertyNames"] = "accumulatingPropertyNames";
    DatumFilterKeys["Aggregation"] = "aggregation";
    DatumFilterKeys["CombiningType"] = "combiningType";
    DatumFilterKeys["DataPath"] = "dataPath";
    DatumFilterKeys["EndDate"] = "endDate";
    DatumFilterKeys["InstantaneousPropertyName"] = "instantaneousPropertyName";
    DatumFilterKeys["InstantaneousPropertyNames"] = "instantaneousPropertyNames";
    DatumFilterKeys["LocalEndDate"] = "localEndDate";
    DatumFilterKeys["LocalStartDate"] = "localStartDate";
    DatumFilterKeys["LocationId"] = "locationId";
    DatumFilterKeys["LocationIds"] = "locationIds";
    DatumFilterKeys["Location"] = "location";
    DatumFilterKeys["MetadataFilter"] = "metadataFilter";
    DatumFilterKeys["MostRecent"] = "mostRecent";
    DatumFilterKeys["NodeIdMaps"] = "nodeIdMaps";
    DatumFilterKeys["NodeId"] = "nodeId";
    DatumFilterKeys["NodeIds"] = "nodeIds";
    DatumFilterKeys["PartialAggregation"] = "partialAggregation";
    DatumFilterKeys["PropertyName"] = "propertyName";
    DatumFilterKeys["PropertyNames"] = "propertyNames";
    DatumFilterKeys["Query"] = "query";
    DatumFilterKeys["SourceIdMaps"] = "sourceIdMaps";
    DatumFilterKeys["SourceId"] = "sourceId";
    DatumFilterKeys["SourceIds"] = "sourceIds";
    DatumFilterKeys["StartDate"] = "startDate";
    DatumFilterKeys["StatusPropertyName"] = "statusPropertyName";
    DatumFilterKeys["StatusPropertyNames"] = "statusPropertyNames";
    DatumFilterKeys["StreamIds"] = "streamIds";
    DatumFilterKeys["Tags"] = "tags";
    DatumFilterKeys["UserId"] = "userId";
    DatumFilterKeys["UserIds"] = "userIds";
    DatumFilterKeys["WithoutTotalResultsCount"] = "withoutTotalResultsCount";
})(DatumFilterKeys || (DatumFilterKeys = {}));
/** Sorted list of all datum filter key values. */
const DatumFilterPropertyNames = Object.values(DatumFilterKeys).sort();
/** A set of datum filter key values. */
new Set(DatumFilterPropertyNames);
/**
 * Combine an ID map into a query parameter.
 * @param map - ID mapping
 * @returns the query parameter value, or `undefined` if no mapping available
 * @private
 */
function idMapQueryParameterValue(map) {
    if (!(map instanceof Map && map.size > 0)) {
        return undefined;
    }
    const result = [];
    for (const e of map) {
        if (!(e[1] instanceof Set)) {
            continue;
        }
        result.push(`${e[0]}:${Array.from(e[1]).join(",")}`);
    }
    return result;
}
/**
 * A filter criteria object for datum.
 *
 * This filter is used to query both node datum and location datum. Not all properties are
 * applicable to both types. Be sure to consult the SolarNet API documentation on the
 * supported properties for each type.
 */
class DatumFilter extends PropMap {
    /**
     * Constructor.
     * @param props - initial property values
     */
    constructor(props) {
        super(props);
        this.#cleanupSingularProperties();
    }
    #cleanupSingularProperties() {
        if (this.size < 1) {
            return;
        }
    }
    /**
     * A node ID.
     *
     * This manages the first available node ID from the `nodeIds` property.
     * Set to `null` to remove.
     */
    get nodeId() {
        const nodeIds = this.nodeIds;
        return Array.isArray(nodeIds) && nodeIds.length > 0
            ? nodeIds[0]
            : undefined;
    }
    set nodeId(nodeId) {
        if (typeof nodeId === "number") {
            this.nodeIds = [nodeId];
        }
        else {
            this.nodeIds = null;
        }
    }
    /**
     * An array of node IDs. Set to `null` to remove.
     */
    get nodeIds() {
        return this.prop(DatumFilterKeys.NodeIds);
    }
    set nodeIds(nodeIds) {
        this.prop(DatumFilterKeys.NodeIds, Array.isArray(nodeIds) ? nodeIds : null);
    }
    /**
     * A location ID.
     *
     * This manages the first available location ID from the `locationIds` property.
     * Set to `null` to remove.
     */
    get locationId() {
        const locationIds = this.locationIds;
        return Array.isArray(locationIds) && locationIds.length > 0
            ? locationIds[0]
            : undefined;
    }
    set locationId(locationId) {
        if (typeof locationId === "number") {
            this.locationIds = [locationId];
        }
        else {
            this.locationIds = null;
        }
    }
    /**
     * An array of location IDs. Set to `null` to remove.
     */
    get locationIds() {
        return this.prop(DatumFilterKeys.LocationIds);
    }
    set locationIds(locationIds) {
        this.prop(DatumFilterKeys.LocationIds, Array.isArray(locationIds) ? locationIds : null);
    }
    /**
     * A source ID.
     *
     * This manages the first available source ID from the `sourceIds` property.
     * Set to `null` to remove.
     */
    get sourceId() {
        const sourceIds = this.sourceIds;
        return Array.isArray(sourceIds) && sourceIds.length > 0
            ? sourceIds[0]
            : undefined;
    }
    set sourceId(sourceId) {
        if (sourceId) {
            this.sourceIds = [sourceId];
        }
        else {
            this.sourceIds = null;
        }
    }
    /**
     * An array of source IDs. Set to `null` to remove.
     */
    get sourceIds() {
        return this.prop(DatumFilterKeys.SourceIds);
    }
    set sourceIds(sourceIds) {
        this.prop(DatumFilterKeys.SourceIds, Array.isArray(sourceIds) ? sourceIds : null);
    }
    /**
     * A stream ID.
     *
     * This manages the first available stream ID from the `streamIds` property.
     * Set to `null` to remove.
     */
    get streamId() {
        const streamIds = this.streamIds;
        return Array.isArray(streamIds) && streamIds.length > 0
            ? streamIds[0]
            : undefined;
    }
    set streamId(streamId) {
        if (streamId) {
            this.streamIds = [streamId];
        }
        else {
            this.streamIds = null;
        }
    }
    /**
     * An array of stream IDs. Set to `null` to remove.
     */
    get streamIds() {
        return this.prop(DatumFilterKeys.StreamIds);
    }
    set streamIds(streamIds) {
        this.prop(DatumFilterKeys.StreamIds, Array.isArray(streamIds) ? streamIds : null);
    }
    /**
     * A user ID.
     *
     * This manages the first available location ID from the `userIds` property.
     * Set to `null` to remove.
     */
    get userId() {
        const userIds = this.userIds;
        return Array.isArray(userIds) && userIds.length > 0
            ? userIds[0]
            : undefined;
    }
    set userId(userId) {
        if (userId) {
            this.userIds = [userId];
        }
        else {
            this.userIds = null;
        }
    }
    /**
     * An array of user IDs. Set to `null` to remove.
     */
    get userIds() {
        return this.prop(DatumFilterKeys.UserIds);
    }
    set userIds(userIds) {
        this.prop(DatumFilterKeys.UserIds, Array.isArray(userIds) ? userIds : null);
    }
    /**
     * The "most recent" flag. Set to `null` to remove.
     */
    get mostRecent() {
        return !!this.prop(DatumFilterKeys.MostRecent);
    }
    set mostRecent(value) {
        this.prop(DatumFilterKeys.MostRecent, !!value);
    }
    /**
     * A minimumin date. Set to `null` to remove.
     */
    get startDate() {
        return this.prop(DatumFilterKeys.StartDate);
    }
    set startDate(date) {
        this.prop(DatumFilterKeys.StartDate, date);
    }
    /**
     * A maximum date. Set to `null` to remove.
     */
    get endDate() {
        return this.prop(DatumFilterKeys.EndDate);
    }
    set endDate(date) {
        this.prop(DatumFilterKeys.EndDate, date);
    }
    /**
     * Alocal minimumin date. Set to `null` to remove.
     */
    get localStartDate() {
        return this.prop(DatumFilterKeys.LocalStartDate);
    }
    set localStartDate(date) {
        this.prop(DatumFilterKeys.LocalStartDate, date);
    }
    /**
     * A local maximum date. Set to `null` to remove.
     */
    get localEndDate() {
        return this.prop(DatumFilterKeys.LocalEndDate);
    }
    set localEndDate(date) {
        this.prop(DatumFilterKeys.LocalEndDate, date);
    }
    /**
     * A data path, in dot-delimited notation like `i.watts`.
     * Set to `null` to remove.
     */
    get dataPath() {
        return this.prop(DatumFilterKeys.DataPath);
    }
    set dataPath(path) {
        this.prop(DatumFilterKeys.DataPath, path);
    }
    /**
     * An aggregation.
     *
     * Including this in a filter will cause SolarNet to return aggregated results, rather
     * than raw results. Set to `null` to remove.
     */
    get aggregation() {
        return this.prop(DatumFilterKeys.Aggregation);
    }
    set aggregation(agg) {
        this.prop(DatumFilterKeys.Aggregation, agg instanceof Aggregation ? agg : null);
    }
    /**
     * A partial aggregation.
     *
     * Including this in a filter along with `aggregation`  will cause SolarNet to return aggregated results that
     * include partial results of this granularity. For example if `aggregation == 'Month'` and
     * `partialAggregation == 'Day'` and a date range of 15 Jan - 15 Mar was requested, 3 month results would
     * be returned for the date ranges 15 Jan - 31 Jan, 1 Feb - 28 Feb, and 1 Mar - 14 Mar.
     *
     * Set to `null` to remove.
     */
    get partialAggregation() {
        return this.prop(DatumFilterKeys.PartialAggregation);
    }
    set partialAggregation(agg) {
        this.prop(DatumFilterKeys.PartialAggregation, agg instanceof Aggregation ? agg : null);
    }
    /**
     * An array of tags. Set to `null` to remove.
     */
    get tags() {
        return this.prop(DatumFilterKeys.Tags);
    }
    set tags(val) {
        this.prop(DatumFilterKeys.Tags, Array.isArray(val) ? val : null);
    }
    /**
     * A location, used as an example-based search criteria. Set to `null` to remove.
     */
    get location() {
        return this.prop(DatumFilterKeys.Location);
    }
    set location(val) {
        this.prop(DatumFilterKeys.Location, val instanceof Location ? val : null);
    }
    /**
     * A general full-text style query string. Set to `null` to remove.
     */
    get query() {
        return this.prop(DatumFilterKeys.Query);
    }
    set query(val) {
        this.prop(DatumFilterKeys.Query, val);
    }
    /**
     * A metadata filter (LDAP style search criteria). Set to `null` to remove.
     */
    get metadataFilter() {
        return this.prop(DatumFilterKeys.MetadataFilter);
    }
    set metadataFilter(val) {
        this.prop(DatumFilterKeys.MetadataFilter, val);
    }
    /**
     * Get the _without total results_ flag. Set to `null` to remove.
     */
    get withoutTotalResultsCount() {
        return this.prop(DatumFilterKeys.WithoutTotalResultsCount);
    }
    set withoutTotalResultsCount(val) {
        this.prop(DatumFilterKeys.WithoutTotalResultsCount, val !== null ? !!val : null);
    }
    /**
     * Get the combining type.
     *
     * Use this to combine nodes and/or sources into virtual groups. Requires some combination
     * of {@link Domain.DatumFilter#nodeIdMaps} or {@link Domain.DatumFilter#sourceIdMaps} also be specified.
     * Set to `null` to remove.
     */
    get combiningType() {
        return this.prop(DatumFilterKeys.CombiningType);
    }
    set combiningType(type) {
        this.prop(DatumFilterKeys.CombiningType, type instanceof CombiningType ? type : null);
    }
    /**
     * A mapping of virtual node IDs to sets of real node IDs to combine. Set to `null` to remove.
     */
    get nodeIdMaps() {
        return this.prop(DatumFilterKeys.NodeIdMaps);
    }
    set nodeIdMaps(map) {
        this.prop(DatumFilterKeys.NodeIdMaps, map instanceof Map ? map : null);
    }
    /**
     * A mapping of virtual source IDs to sets of real source IDs to combine. Set to `null` to remove.
     */
    get sourceIdMaps() {
        return this.prop(DatumFilterKeys.SourceIdMaps);
    }
    set sourceIdMaps(map) {
        this.prop(DatumFilterKeys.SourceIdMaps, map instanceof Map ? map : null);
    }
    /**
     * A property name.
     *
     * This manages the first available value from the `propertyNames` property.
     * Set to `null` to remove.
     */
    get propertyName() {
        const names = this.propertyNames;
        return Array.isArray(names) && names.length > 0 ? names[0] : undefined;
    }
    set propertyName(name) {
        if (name) {
            this.propertyNames = [name];
        }
        else {
            this.propertyNames = null;
        }
    }
    /**
     * An array of property names. Set to `null` to remove.
     */
    get propertyNames() {
        return this.prop(DatumFilterKeys.PropertyNames);
    }
    set propertyNames(names) {
        this.prop(DatumFilterKeys.PropertyNames, Array.isArray(names) ? names : null);
    }
    /**
     * An instantaneous property name.
     *
     * This manages the first available value from the `instantaneousPropertyNames` property.
     * Set to `null` to remove.
     */
    get instantaneousPropertyName() {
        const names = this.instantaneousPropertyNames;
        return Array.isArray(names) && names.length > 0 ? names[0] : undefined;
    }
    set instantaneousPropertyName(name) {
        if (name) {
            this.instantaneousPropertyNames = [name];
        }
        else {
            this.instantaneousPropertyNames = null;
        }
    }
    /**
     * An array of instantaneous property names. Set to `null` to remove.
     */
    get instantaneousPropertyNames() {
        return this.prop(DatumFilterKeys.InstantaneousPropertyNames);
    }
    set instantaneousPropertyNames(names) {
        this.prop(DatumFilterKeys.InstantaneousPropertyNames, Array.isArray(names) ? names : null);
    }
    /**
     * An accumulating property name.
     *
     * This manages the first available value from the `accumulatingPropertyNames` property.
     * Set to `null` to remove.
     */
    get accumulatingPropertyName() {
        const names = this.accumulatingPropertyNames;
        return Array.isArray(names) && names.length > 0 ? names[0] : undefined;
    }
    set accumulatingPropertyName(name) {
        if (name) {
            this.accumulatingPropertyNames = [name];
        }
        else {
            this.accumulatingPropertyNames = null;
        }
    }
    /**
     * An array of accumulating property names. Set to `null` to remove.
     */
    get accumulatingPropertyNames() {
        return this.prop(DatumFilterKeys.AccumulatingPropertyNames);
    }
    set accumulatingPropertyNames(names) {
        this.prop(DatumFilterKeys.AccumulatingPropertyNames, Array.isArray(names) ? names : null);
    }
    /**
     * A property name.
     *
     * This manages the first available value from the `statusPropertyNames` property.
     * Set to `null` to remove.
     */
    get statusPropertyName() {
        const names = this.statusPropertyNames;
        return Array.isArray(names) && names.length > 0 ? names[0] : undefined;
    }
    set statusPropertyName(name) {
        if (name) {
            this.statusPropertyNames = [name];
        }
        else {
            this.statusPropertyNames = null;
        }
    }
    /**
     * An array of property names. Set to `null` to remove.
     */
    get statusPropertyNames() {
        return this.prop(DatumFilterKeys.StatusPropertyNames);
    }
    set statusPropertyNames(names) {
        this.prop(DatumFilterKeys.StatusPropertyNames, Array.isArray(names) ? names : null);
    }
    /**
     * @override
     * @inheritdoc
     */
    toUriEncoding(propertyName, callbackFn) {
        return super.toUriEncoding(propertyName, callbackFn || datumFilterUriEncodingPropertyMapper);
    }
}
/**
 * Map DatumFilter properties for URI encoding.
 *
 * @param key - the property key
 * @param value - the property value
 * @returns 2 or 3-element array for mapped key+value+forced-multi-key, `null` to skip, or `key` to keep as-is
 * @private
 */
function datumFilterUriEncodingPropertyMapper(key, value) {
    if (key === DatumFilterKeys.NodeIds ||
        key === DatumFilterKeys.LocationIds ||
        key === DatumFilterKeys.SourceIds ||
        key === DatumFilterKeys.UserIds ||
        key === DatumFilterKeys.PropertyNames ||
        key === DatumFilterKeys.InstantaneousPropertyNames ||
        key === DatumFilterKeys.AccumulatingPropertyNames ||
        key === DatumFilterKeys.StatusPropertyNames) {
        // check for singleton array value, and re-map to singular property by chopping of "s"
        if (Array.isArray(value) && value.length === 1) {
            return [key.substring(0, key.length - 1), value[0]];
        }
    }
    else if (key === DatumFilterKeys.StartDate ||
        key === DatumFilterKeys.EndDate) {
        return [key, dateUrlFormat(value)];
    }
    else if (key === DatumFilterKeys.LocalStartDate ||
        key === DatumFilterKeys.LocalEndDate) {
        return [key, localDateUrlFormat(value)];
    }
    else if (key === DatumFilterKeys.MostRecent && !value) {
        return null;
    }
    else if (key === DatumFilterKeys.NodeIdMaps ||
        key === DatumFilterKeys.SourceIdMaps) {
        const p = idMapQueryParameterValue(value);
        return p ? [key, p, true] : null;
    }
    return key;
}

/**
 * An immutable enum-like object with an associated key value.
 *
 * This class must be extended by another class that overrides the
 * inerited {@link Util.Enum.enumValues} method.
 */
class KeyedEnum extends Enum {
    /** The key value. */
    #key;
    /**
     * Constructor.
     *
     * @param name - the unique name for this type
     * @param key - the key value associated with this type
     */
    constructor(name, key) {
        super(name);
        this.#key = key;
    }
    /**
     * Get the key value.
     *
     * @returns the key value
     */
    get key() {
        return this.#key;
    }
    /**
     * Get an enum instance from its key or name.
     *
     * This method searches the {@link Util.Enum.enumValues} array for a matching key or name value.
     *
     * @param value - the enum key or name to get the enum instance for
     * @returns the matching enum value, or `undefined` if no values match
     */
    static valueOf(value) {
        const enums = this.enumValues();
        if (!Array.isArray(enums)) {
            return undefined;
        }
        for (let i = 0, len = enums.length; i < len; i += 1) {
            if (value === enums[i].key) {
                return enums[i];
            }
            else if (value === enums[i].name) {
                return enums[i];
            }
        }
        return undefined;
    }
}

/* eslint no-console: 0 */
let logLevel = 2;
function consoleLog(level, ...args) {
    if (level > logLevel) {
        return;
    }
    /* c8 ignore next 3 */
    if (!console) {
        return;
    }
    let logFn;
    switch (level) {
        case 1:
            logFn = console.error;
            break;
        case 2:
            logFn = console.warn;
            break;
        case 3:
            logFn = console.info;
            break;
    }
    if (!logFn) {
        logFn = console.log;
    }
    /* c8 ignore next 3 */
    if (typeof logFn !== "function") {
        return;
    }
    logFn(...args);
}
/** Enumeration of logger levels. */
var LogLevel;
(function (LogLevel) {
    /** Verbose level. */
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
    /** Informational level. */
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    /** Warning level. */
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    /** Error level. */
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    /** No logging. */
    LogLevel[LogLevel["OFF"] = 0] = "OFF";
})(LogLevel || (LogLevel = {}));
/**
 * An application logger.
 *
 * Logging levels range from 0-4 and is controlled at the application level.
 * Level `0` is off, `1` is error, `2` is warn, `3` is info,  and `4` is debug.
 * The default level is `2`.
 */
class Logger {
    /** The global log level. */
    static get level() {
        return logLevel;
    }
    static set level(val) {
        logLevel = typeof val === "number" ? val : 0;
    }
    /**
     * Log at debug level.
     * @param args - the log arguments
     */
    static debug(...args) {
        consoleLog(4, ...args);
    }
    /**
     * Log at info level.
     * @param args - the log arguments
     */
    static info(...args) {
        consoleLog(3, ...args);
    }
    /**
     * Log at warn level.
     * @param args - the log arguments
     */
    static warn(...args) {
        consoleLog(2, ...args);
    }
    /**
     * Log at error level.
     * @param args - the log arguments
     */
    static error(...args) {
        consoleLog(1, ...args);
    }
}

/**
 * An abstract class for JSON client support.
 */
class JsonClientSupport {
    /**
     * The API instance to use.
     */
    api;
    /**
     * An authorization builder to use to make authenticated HTTP requests.
     */
    authBuilder;
    /**
     * Constructor.
     *
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried
     */
    constructor(api, authBuilder) {
        this.api = api;
        this.authBuilder = authBuilder;
        if (!authBuilder) {
            api.publicQuery = true;
        }
    }
    /**
     * Create a URL fetch requestor.
     *
     * The returned function can be passed to `d3.queue` or invoked directly.
     *
     * @param url the URL to request.
     * @param signUrl the URL to sign (might be different to `url` if a proxy is used)
     * @returns a function that accepts a callback argument
     */
    requestor(url, signUrl) {
        const auth = this.authBuilder;
        return (cb) => {
            const headers = {
                Accept: "application/json",
            };
            if (auth && auth.signingKeyValid) {
                headers[HttpHeaders.AUTHORIZATION] = auth
                    .reset()
                    .snDate(true)
                    .url(signUrl || url, true)
                    .buildWithSavedKey();
                headers[HttpHeaders.X_SN_DATE] = auth.requestDateHeaderValue;
            }
            const errorHandler = (error) => {
                Logger.error("Error requesting data for %s: %s", url, error);
                cb(new Error(`Error requesting data for ${url}: ${error}`));
            };
            fetch(url, {
                headers: headers,
            }).then((res) => {
                if (!res.ok) {
                    errorHandler(res.statusText);
                    return;
                }
                res.json().then((json) => {
                    const r = json;
                    if (!r.success) {
                        let msg = "non-success result returned";
                        if (r.message) {
                            msg += " (" + r.message + ")";
                        }
                        errorHandler(msg);
                        return;
                    }
                    cb(undefined, r.data);
                }, errorHandler);
            }, errorHandler);
        };
    }
}

var slice = [].slice;

var noabort = {};

function Queue(size) {
  this._size = size;
  this._call =
  this._error = null;
  this._tasks = [];
  this._data = [];
  this._waiting =
  this._active =
  this._ended =
  this._start = 0; // inside a synchronous task callback?
}

Queue.prototype = queue.prototype = {
  constructor: Queue,
  defer: function(callback) {
    if (typeof callback !== "function") throw new Error("invalid callback");
    if (this._call) throw new Error("defer after await");
    if (this._error != null) return this;
    var t = slice.call(arguments, 1);
    t.push(callback);
    ++this._waiting, this._tasks.push(t);
    poke(this);
    return this;
  },
  abort: function() {
    if (this._error == null) abort(this, new Error("abort"));
    return this;
  },
  await: function(callback) {
    if (typeof callback !== "function") throw new Error("invalid callback");
    if (this._call) throw new Error("multiple await");
    this._call = function(error, results) { callback.apply(null, [error].concat(results)); };
    maybeNotify(this);
    return this;
  },
  awaitAll: function(callback) {
    if (typeof callback !== "function") throw new Error("invalid callback");
    if (this._call) throw new Error("multiple await");
    this._call = callback;
    maybeNotify(this);
    return this;
  }
};

function poke(q) {
  if (!q._start) {
    try { start(q); } // let the current task complete
    catch (e) {
      if (q._tasks[q._ended + q._active - 1]) abort(q, e); // task errored synchronously
      else if (!q._data) throw e; // await callback errored synchronously
    }
  }
}

function start(q) {
  while (q._start = q._waiting && q._active < q._size) {
    var i = q._ended + q._active,
        t = q._tasks[i],
        j = t.length - 1,
        c = t[j];
    t[j] = end(q, i);
    --q._waiting, ++q._active;
    t = c.apply(null, t);
    if (!q._tasks[i]) continue; // task finished synchronously
    q._tasks[i] = t || noabort;
  }
}

function end(q, i) {
  return function(e, r) {
    if (!q._tasks[i]) return; // ignore multiple callbacks
    --q._active, ++q._ended;
    q._tasks[i] = null;
    if (q._error != null) return; // ignore secondary errors
    if (e != null) {
      abort(q, e);
    } else {
      q._data[i] = r;
      if (q._waiting) poke(q);
      else maybeNotify(q);
    }
  };
}

function abort(q, e) {
  var i = q._tasks.length, t;
  q._error = e; // ignore active callbacks
  q._data = undefined; // allow gc
  q._waiting = NaN; // prevent starting

  while (--i >= 0) {
    if (t = q._tasks[i]) {
      q._tasks[i] = null;
      if (t.abort) {
        try { t.abort(); }
        catch (e) { /* ignore */ }
      }
    }
  }

  q._active = NaN; // allow notification
  maybeNotify(q);
}

function maybeNotify(q) {
  if (!q._active && q._call) {
    var d = q._data;
    q._data = undefined; // allow gc
    q._call(q._error, d);
  }
}

function queue(concurrency) {
  if (concurrency == null) concurrency = Infinity;
  else if (!((concurrency = +concurrency) >= 1)) throw new Error("invalid concurrency");
  return new Queue(concurrency);
}

/**
 * An enumeration of supported datum reading type names.
 */
var DatumReadingTypeNames;
(function (DatumReadingTypeNames) {
    /**
     * Derive a single reading value based from one datum the nearest before a
     * specific time and one the nearest after.
     */
    DatumReadingTypeNames["CalculatedAt"] = "CalculatedAt";
    /**
     * Calculate the difference between two reading values on two dates, using the
     * `CalcualtedAt` style of deriving the start and end readings.
     */
    DatumReadingTypeNames["CalculatedAtDifference"] = "CalculatedAtDifference";
    /**
     * Find the difference between two datum that are nearest in time on or before
     * two dates, without any limits on how near to those dates the datum are.
     */
    DatumReadingTypeNames["NearestDifference"] = "NearestDifference";
    /**
     * Find the difference between two datum that are nearest in time and within
     * two dates.
     */
    DatumReadingTypeNames["Difference"] = "Difference";
    /**
     * Find the difference between two datum that are nearest in time on or before
     * two dates, constrained by a maximum time tolerance.
     */
    DatumReadingTypeNames["DifferenceWithin"] = "DifferenceWithin";
})(DatumReadingTypeNames || (DatumReadingTypeNames = {}));
/**
 * An enumeration of datum reading types.
 */
class DatumReadingType extends KeyedEnum {
    /**
     * Constructor.
     *
     * @param name - the unique name for this type
     * @param key - the key value associated with this type
     */
    constructor(name, key) {
        super(name, key);
        if (this.constructor === DatumReadingType) {
            Object.freeze(this);
        }
    }
    /**
     * @override
     * @inheritdoc
     */
    static enumValues() {
        return DatumReadingTypeValues;
    }
}
/**
 * The datum reading type enum values array.
 */
const DatumReadingTypeValues = Object.freeze([
    new DatumReadingType(DatumReadingTypeNames.CalculatedAt, "at"),
    new DatumReadingType(DatumReadingTypeNames.CalculatedAtDifference, "atd"),
    new DatumReadingType(DatumReadingTypeNames.NearestDifference, "diff"),
    new DatumReadingType(DatumReadingTypeNames.Difference, "delta"),
    new DatumReadingType(DatumReadingTypeNames.DifferenceWithin, "change"),
]);
/**
 * The enumeration of supported `DatumReadingType` values.
 * @see {@link Domain.DatumReadingTypeNames} for the available values
 */
const DatumReadingTypes = DatumReadingType.enumsValue(DatumReadingTypeValues);

const DEFAULT_PAGE_SIZE = 1000;
/**
 * Load data for a set of source IDs, date range, and aggregate level using either the `listDatumUrl()`
 * or `datumReadingUrl()` URLs of `SolarQueryApi` (the `/datum/list` or `/datum/reading`
 * endpoints).
 *
 * This object is designed to be used once per query. After creating the object and optionally configuring
 * any other settings, call {@link DatumLoader#fetch} to start loading the data. The returned `Promise`
 * will be resolved once all data has been loaded.
 *
 * @example
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * // configure other filter settings here...
 *
 * const results = await new DatumLoader(new SolarQueryApi(), filter).fetch();
 * // results is an array of Datum objects
 *
 * @version 2.0.0
 */
class DatumLoader extends JsonClientSupport {
    /** The filter. */
    filter;
    #pageSize;
    #includeTotalResultsCount;
    #callback;
    #urlParameters;
    /**
     * When `true` then call the callback function for every page of data as it becomes available.
     * Otherwise the callback function will be invoked only after all data has been loaded.
     */
    #incrementalMode;
    /**
     * When `true` then invoke the `/datum/reading` endpoint to load data, otherwise use `/datum/list`.
     */
    #readingsMode;
    /**
     * An optional proxy URL to use instead of the host returned by the configured `SolarQueryApi`.
     * This should be configured as an absolute URL to the proxy target, e.g. `https://query.solarnetwork.net/1m`.
     */
    #proxyUrl;
    /**
     * When > 0 then make one request that includes the total result count and first page of
     * results, followed by parallel requests for the remaining pages.
     */
    #concurrency;
    /**
     * A queue to use for parallel mode, when `concurrency` configured > 0.
     */
    #queue;
    #state;
    #results;
    #promise;
    /**
     * Constructor.
     *
     * @param api a URL helper for accessing node datum via SolarQuery
     * @param filter the filter parameters to use
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api, filter, authBuilder) {
        super(api, authBuilder);
        this.filter = filter;
        this.#pageSize = DEFAULT_PAGE_SIZE;
        this.#includeTotalResultsCount = false;
        this.#callback = null;
        this.#urlParameters = null;
        this.#incrementalMode = false;
        this.#readingsMode = false;
        this.#proxyUrl = null;
        this.#concurrency = 0;
        this.#state = 0;
    }
    concurrency(value) {
        if (value === undefined) {
            return this.#concurrency;
        }
        if (!isNaN(value) && Number(value) > 0) {
            this.#concurrency = Number(value);
        }
        return this;
    }
    callback(value) {
        if (value === undefined) {
            return this.#callback;
        }
        if (value === null || typeof value === "function") {
            this.#callback = value;
        }
        return this;
    }
    parameters(value) {
        if (value === undefined) {
            return this.#urlParameters;
        }
        if (value === null || typeof value === "object") {
            this.#urlParameters = value;
        }
        return this;
    }
    incremental(value) {
        if (value === undefined) {
            return this.#incrementalMode;
        }
        this.#incrementalMode = !!value;
        return this;
    }
    paginationSize(value) {
        if (value === undefined) {
            return this.#pageSize;
        }
        else if (isNaN(Number(value))) {
            value = DEFAULT_PAGE_SIZE;
        }
        this.#pageSize = value;
        return this;
    }
    includeTotalResultsCount(value) {
        if (value === undefined) {
            return this.#includeTotalResultsCount;
        }
        this.#includeTotalResultsCount = !!value;
        return this;
    }
    readings(value) {
        if (value === undefined) {
            return this.#readingsMode;
        }
        this.#readingsMode = !!value;
        return this;
    }
    proxyUrl(value) {
        if (value === undefined) {
            return this.#proxyUrl;
        }
        this.#proxyUrl = value;
        return this;
    }
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch() {
        if (this.#incrementalMode) {
            return Promise.reject(new Error("Incremental mode is not supported via fetch(), use load(callback) instead."));
        }
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results || []);
                }
            });
        });
    }
    /**
     * Initiate loading the data.
     *
     * As an alternative to configuring the callback function via the {@link DatumLoader.callback}
     * method,a callback function can be passed as an argument to this function. That allows this
     * function to be passed to things like `queue.defer`, for example.
     *
     * @param callback a callback function to use; either this argument must be provided
     *                 or the function must have already been configured via {@link DatumLoader.callback}
     * @returns this object
     */
    load(callback) {
        // to support queue use, allow callback to be passed directly to this function
        if (typeof callback === "function") {
            this.#callback = callback;
        }
        if (!this.#callback) {
            throw new Error("No callback provided.");
        }
        this.#state = 1;
        if (this.#concurrency > 0) {
            this.#queue = queue(this.#concurrency);
        }
        this.#loadData(new Pagination(this.#pageSize, 0));
        return this;
    }
    /**
     * Invoke the configured callback function.
     *
     * @param error an optional  error
     * @param done `true` if there is no more data to load
     * @param page the incremental mode page
     */
    #handleResults(error, done, page) {
        if (done) {
            this.#state = 2; // done
        }
        if (this.#callback) {
            let args;
            if (this.#incrementalMode) {
                args = [error, this.#results, done, page];
            }
            else {
                args = [error, this.#results, undefined, undefined];
            }
            this.#callback(...args);
        }
    }
    /**
     * Load a single page of data, starting at a specific offset.
     *
     * @param page the page to load
     * @param q the queue to use
     */
    #loadData(page, q) {
        const queryFilter = new DatumFilter(this.filter);
        queryFilter.withoutTotalResultsCount =
            (this.#includeTotalResultsCount || q) && page.offset === 0
                ? false
                : true;
        let url = this.#readingsMode
            ? this.api.datumReadingUrl(DatumReadingTypes.Difference, queryFilter, undefined, undefined, page)
            : this.api.listDatumUrl(queryFilter, undefined, page);
        if (this.#urlParameters) {
            const queryParams = urlQueryEncode(this.#urlParameters);
            if (queryParams) {
                url += "&" + queryParams;
            }
        }
        const reqUrl = this.#proxyUrl
            ? url.replace(/^[^:]+:\/\/[^/]+/, this.#proxyUrl)
            : url;
        const query = this.requestor(reqUrl, url);
        const handler = (error, data) => {
            if (error) {
                if (!q) {
                    this.#handleResults(error, true);
                    return;
                }
            }
            const dataArray = datumExtractor(data);
            if (dataArray === undefined) {
                Logger.debug("No data available for %s", reqUrl);
                if (!q) {
                    this.#handleResults(undefined, true);
                    return;
                }
            }
            const incMode = this.#incrementalMode;
            const nextOffset = offsetExtractor(data, page);
            const done = !!q || nextOffset < 1;
            const totalResults = data && data.totalResults !== undefined ? data.totalResults : 0;
            if (!q && dataArray) {
                this.#results =
                    this.#results === undefined
                        ? dataArray
                        : this.#results.concat(dataArray);
            }
            if (incMode || (!q && done)) {
                this.#handleResults(undefined, done, page);
            }
            // load additional pages as needed
            if (!done) {
                if (!q && this.#queue && totalResults > 0) {
                    // parallel mode after first page results; queue all remaining pages
                    for (let pOffset = nextOffset; pOffset < totalResults; pOffset += page.max) {
                        this.#loadData(page.withOffset(pOffset), this.#queue);
                    }
                    this.#queue.awaitAll((error, allResults) => {
                        const queryResults = allResults;
                        if (!error &&
                            queryResults &&
                            queryResults.findIndex((el) => el === undefined) >=
                                0) {
                            // some result is unexpectedly undefined; seen this under Node from
                            // https://github.com/driverdan/node-XMLHttpRequest/issues/162
                            // where the HTTP client lib is not reporting back an actual error value
                            // when something happens like a response timeout
                            error = new Error("One or more requests did not return a result, but no error was reported.");
                        }
                        if (!error && queryResults) {
                            queryResults.forEach((queryResult) => {
                                const dataArray = datumExtractor(queryResult);
                                if (!dataArray) {
                                    return;
                                }
                                if (!this.#results) {
                                    this.#results = dataArray;
                                }
                                else {
                                    this.#results =
                                        this.#results.concat(dataArray);
                                }
                            });
                        }
                        this.#handleResults(error !== null ? error : undefined, true);
                    });
                }
                else {
                    // serially move to next page
                    this.#loadData(page.withOffset(nextOffset));
                }
            }
        };
        if (q) {
            q.defer(query);
        }
        else {
            query(handler);
        }
    }
}
/**
 * Extract the datum list from the returned data.
 *
 * @param data the JSON results to extract from
 * @returns the extracted data
 */
function datumExtractor(data) {
    if (Array.isArray(data?.results)) {
        return data.results;
    }
    return undefined;
}
/**
 * Extract the "next" offset to use based on the returned data.
 *
 * If `page` is supplied, then pagination will be based on `page.max` and will continue
 * until less than that many results are returned. If `page` is not supplied, then
 * pagination will be based on `data.returnedResultCount` and will continue until
 * `data.totalResults` has been returned.
 *
 * @param data the JSON results to extract from
 * @param page the incremental mode page
 * @returns the extracted offset, or `0` if no more pages to return
 */
function offsetExtractor(data, page) {
    if (!data) {
        return 0;
    }
    // don't bother with totalResults; just keep going unless returnedResultCount < page.max
    return data.returnedResultCount < page.max
        ? 0
        : data.startingOffset + page.max;
}

/**
 * Class to find the available datum date range for a set of datum filters.
 *
 * This is useful when generating reports or charts for a set of SolarNode datum streams,
 * so the overall start/end dates can be determined before requesting the actual data.
 * It returns an object starting and ending date related properties, for example:
 *
 * ```json
 * {
 *   "timeZone":        "Pacific/Auckland",
 *   "sDate":           Date(1248668709972),
 *   "startDate":       "2009-07-27 16:25",
 *   "startDateMillis": 1248668709972,
 *   "eDate":           Date(1379824746781),
 *   "endDate":         "2013-09-22 16:39",
 *   "endDateMillis":   1379824746781
 * }
 * ```
 *
 * Additionally a `ranges` property is provided with an array of each filter's raw
 * range result, so you can see each result individually if you need that.
 *
 * @example
 * // the simple case, for just one node
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * filter.sourceIds = ['a', 'b'];
 * const range = await new DatumRangeFinder(new SolarQueryApi(), filter).fetch();
 *
 * @example
 * // more complex case, for multiple SolarNode / source ID combinations
 * const filter2 = new SolarQueryApi();
 * filter2.nodeId = 234;
 * filter2.sourceId = 'c';
 * const range2 = await new DatumRangeFinder(api, [filter, filter2]).fetch();
 *
 * @example
 * // with authentication; note the authentication must be valid for all nodes!
 * const auth = new AuthorizationV2Builder('my-token');
 * auth.saveSigningKey('secret');
 * const range3 = await new DatumRangeFinder(api, [filter1, filter2], auth).fetch();
 *
 * @version 2.0.0
 */
class DatumRangeFinder extends JsonClientSupport {
    #filters;
    /**
     * Constructor.
     *
     * @param api the API helper to use
     * @param filters the filter(s) to find the ranges for; each filter must provide at least
     *                one node ID
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api, filters, authBuilder) {
        super(api, authBuilder);
        this.#filters = Array.isArray(filters) ? filters : [filters];
    }
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch() {
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results || {});
                }
            });
        });
    }
    /**
     * Asynchronously find the available datum range using a callback.
     *
     * @param callback the callback function to invoke with the results
     * @returns this object
     */
    load(callback) {
        const q = queue();
        for (const filter of this.#filters) {
            const url = this.api.reportableIntervalUrl(filter.nodeId, filter.sourceIds);
            q.defer(this.requestor(url));
        }
        q.awaitAll((error, results) => {
            if (error) {
                Logger.error("Error requesting available data range: %s", error);
                callback(error);
                return;
            }
            const result = this.#extractReportableInterval(results);
            callback(undefined, result);
        });
        return this;
    }
    #extractReportableInterval(results) {
        let result, i;
        for (i = 0; i < results.length; i += 1) {
            const repInterval = results[i];
            if (repInterval?.endDate === undefined) {
                Logger.debug("No data available for %s sources %s", this.#filters[i].nodeId, this.#filters[i].sourceIds !== undefined
                    ? this.#filters[i].sourceIds.join(",")
                    : "");
                continue;
            }
            if (result === undefined) {
                result = Object.assign({}, repInterval);
            }
            else {
                // merge start/end dates
                // note we don't copy the time zone... this breaks when the tz are different!
                if (repInterval.endDateMillis > result.endDateMillis) {
                    result.endDateMillis = repInterval.endDateMillis;
                    result.endDate = repInterval.endDate;
                }
                if (repInterval.startDateMillis < result.startDateMillis) {
                    result.startDateMillis = repInterval.startDateMillis;
                    result.startDate = repInterval.startDate;
                }
            }
        }
        if (result) {
            if (result.startDateMillis !== undefined) {
                result.sDate = new Date(result.startDateMillis);
            }
            if (result.endDateMillis !== undefined) {
                result.eDate = new Date(result.endDateMillis);
            }
            result.ranges = results;
        }
        return result;
    }
}

/**
 * Class to find the available datum sources for a set of node datum URL helpers.
 *
 * This helper is useful for finding what source IDs are avaialble for a set of nodes.
 * It returns an object with node ID properties with associated source ID array values,
 * for example:
 *
 * ```
 * { 123: ["a", "b", "c"] }
 * ```
 * @example
 * // the simple case, all available sources for just one SolarNode
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * const sources = await new DatumSourceFinder(new SolarQueryApi(), filter).fetch();
 *
 * @example
 * // find all sources matching a wildcard pattern within the past day
 * const filter2 = new DatumFilter();
 * filter2.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
 * filter2.sourceId = '/power/**';
 * const sources2 = await new DatumSourceFinder(new SolarQueryApi(), filter2).fetch();
 *
 * @example
 * // find all sources across multiple SolarNodes
 * const filter3 = new DatumFilter();
 * filter3.nodeId = 234;
 * const sources3 = await new DatumSourceFinder(new SolarQueryApi(), [urlHelper1, urlHelper3]).fetch();
 */
class DatumSourceFinder extends JsonClientSupport {
    #filters;
    /**
     * Constructor.
     *
     * @param api the API helper to use
     * @param filters the filter(s) to find the sources for
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api, filters, authBuilder) {
        super(api, authBuilder);
        this.#filters = Array.isArray(filters) ? filters : [filters];
    }
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch() {
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results || {});
                }
            });
        });
    }
    /**
     * Asynchronously find the available sources using a callback.
     *
     * @param callback the callback function to invoke with the results
     * @returns this object
     */
    load(callback) {
        const q = queue();
        for (const filter of this.#filters) {
            const url = this.api.availableSourcesUrl(filter, true);
            q.defer(this.requestor(url));
        }
        q.awaitAll((error, results) => {
            if (error || !results) {
                Logger.error("Error requesting available sources: %s", error);
                callback(error);
                return;
            }
            const result = {};
            for (const data of results) {
                if (!data) {
                    continue;
                }
                for (const pair of data) {
                    let nodeIds = result[pair.nodeId];
                    if (!nodeIds) {
                        nodeIds = [];
                        result[pair.nodeId] = nodeIds;
                    }
                    if (nodeIds.indexOf(pair.sourceId) < 0) {
                        nodeIds.push(pair.sourceId);
                    }
                }
            }
            callback(undefined, result);
        });
        return this;
    }
}

exports.DatumLoader = DatumLoader;
exports.DatumRangeFinder = DatumRangeFinder;
exports.DatumSourceFinder = DatumSourceFinder;
exports.FetchApi = fetch$2;
exports.JsonClientSupport = JsonClientSupport;
//# sourceMappingURL=solarnetwork-datum-loader.es.cjs.map
