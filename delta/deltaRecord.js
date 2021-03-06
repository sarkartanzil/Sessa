const config = require('../config');
const db = require('./deltadb.js').DeltaDB;
const df = require('./deltaFinancial.js').DeltaFinancial;
const utils = require('../utils');

const DeltaRecord = function DeltaRecord() {
  console.log('TIME\t\t\t\tOPEN\tHIGH\tLOW\tCLOSE\tTRADES\tVOL\tSMA1\tSMA2\tRSI\tMACD\tTR\tATR');
};

const bitmex1MinPrefix = config.bitmex1MinPrefix; // eslint-disable-line

function getHigh(data) {
  let high = 0.001;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] !== null) high = data[i].high > high ? data[i].high : high;
  }
  return high;
}

function getLow(data) {
  let low = Number.MAX_SAFE_INTEGER; // eslint-disable-line
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] !== null) low = data[i].low < low ? data[i].low : low;
  }
  return low;
}

function getTrades(data) {
  let trades = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] !== null) trades += parseInt(data[i].trades, 10);
  }
  return trades;
}

function getVolume(data) {
  let volume = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] !== null) volume += parseInt(data[i].volume, 10);
  }
  return volume;
}

function fiveMinuteProcessing(lastFive) {
  const openFive = lastFive[0] === null ? lastFive[1].open : lastFive[0].open;
  // first element is null when we start on the exact 5 min mark
  const highFive = getHigh(lastFive);
  const lowFive = getLow(lastFive);
  const closeFive = lastFive[lastFive.length - 1].close;
  const tradesFive = getTrades(lastFive);
  const volumeFive = getVolume(lastFive);
  return [openFive, highFive, lowFive, closeFive, tradesFive, volumeFive];
}

function fifteenMinuteProcessing(lastFifteen) {
  const openFifteen = lastFifteen[0] === null ? lastFifteen[1].open : lastFifteen[0].open;
  // first element is null when we start on the exact 5 min mark
  const highFifteen = getHigh(lastFifteen);
  const lowFifteen = getLow(lastFifteen);
  const closeFifteen = lastFifteen[lastFifteen.length - 1].close;
  const tradesFifteen = getTrades(lastFifteen);
  const volumeFifteen = getVolume(lastFifteen);
  return [openFifteen, highFifteen, lowFifteen, closeFifteen, tradesFifteen, volumeFifteen];
}

// set up simple get/set for db values
DeltaRecord.prototype.process = function process(data) {
  const lastCandle = data[data.length - 1];
  const {
    timestamp,
    symbol, // eslint-disable-line
    open,
    high,
    low,
    close,
    trades,
    volume,
    vwap,
  } = lastCandle;
  const jsDate = new Date(timestamp);
  const nixtime = jsDate.getTime();

  db
    .get1MinLast100()
    .then((response) => {
      // IF check whether there are records in the db
      // console.log('records are empty');
      // IF records are empty start entering data

      let lastTime = ''; // timestamp of the last entry in db
      try {
        if (response[response.length - 1].timestamp !== null) {
          lastTime = response[response.length - 1].timestamp;
        }
      } catch (e) {
        lastTime = '';
      }

      // IF it's a new record not an entry that already exists
      if (parseInt(nixtime, 10) !== parseInt(lastTime, 10)) {
        const sma1 = df.sma(response, config.sma1, close);
        const sma2 = df.sma(response, config.sma2, close);
        const [rsiavggain, rsiavgloss, rsi] = df.rsi(response, config.rsi, lastCandle);
        const [mema12, mema26, msignal, macd] = df.macd(
          response,
          config.macd.line1,
          config.macd.line2,
          config.macd.signal,
          lastCandle,
        );
        const [ttr, tatr] = df.avgTrueRange(response, config.atr, lastCandle);
        const tr = utils.roundTo(ttr, 4);
        const atr = utils.roundTo(tatr, 4);

        const args = {
          nixtime,
          open,
          high,
          low,
          close,
          trades,
          volume,
          vwap,
          sma1,
          sma2,
          rsi,
          rsiavggain,
          rsiavgloss,
          mema12,
          mema26,
          msignal,
          macd,
          tr,
          atr,
        };
        // insert into db
        db.insert1min(args).catch(console.error);

        // Processing trades at 5 min bins
        if (jsDate.getMinutes() % 5 === 0) {
          const lastFive = utils.arraySlice(4, response);

          lastFive.push(args);

          // console.log(JSON.stringify(lastFive));
          const [
            openFive,
            highFive,
            lowFive,
            closeFive,
            tradesFive,
            volumeFive,
          ] = fiveMinuteProcessing(lastFive);

          db
            .get5MinLast100()
            .then((responseFive) => {
              const lastCandleFive = {
                open: openFive,
                high: highFive,
                low: lowFive,
                close: closeFive,
              };
              const sma1Five = df.sma(responseFive, config.sma1, closeFive);
              const sma2Five = df.sma(responseFive, config.sma2, closeFive);
              const [rsigainFive, rsilossFive, rsiFive] = df.rsi(
                responseFive,
                config.rsi,
                lastCandleFive,
              );

              const [mema12Five, mema26Five, msignalFive, macdFive] = df.macd(
                responseFive,
                config.macd.line1,
                config.macd.line2,
                config.macd.signal,
                lastCandleFive,
              );
              const [ttr5, tatr5] = df.avgTrueRange(responseFive, config.atr, lastCandleFive);
              const trFive = utils.roundTo(ttr5, 4);
              const atrFive = utils.roundTo(tatr5, 4);

              const fiveArgs = {
                nixtime,
                openFive,
                highFive,
                lowFive,
                closeFive,
                tradesFive,
                volumeFive,
                sma1Five,
                sma2Five,
                rsiFive,
                rsigainFive,
                rsilossFive,
                mema12Five,
                mema26Five,
                msignalFive,
                macdFive,
                trFive,
                atrFive,
              };
              // insert data
              db.insert5min(fiveArgs).catch(console.error);
            })
            .catch(console.error);
        }

        // Processing trades in 15 min bins
        if (jsDate.getMinutes() % 15 === 0) {
          const lastFifteen = utils.arraySlice(14, response);

          lastFifteen.push(args);

          const [
            openFifteen,
            highFifteen,
            lowFifteen,
            closeFifteen,
            tradesFifteen,
            volumeFifteen,
          ] = fifteenMinuteProcessing(lastFifteen);

          db
            .get15MinLast100()
            .then((responseFifteen) => {
              const lastCandleFifteen = {
                open: openFifteen,
                high: highFifteen,
                low: lowFifteen,
                close: closeFifteen,
              };
              const sma1Fifteen = df.sma(responseFifteen, config.sma1, closeFifteen);
              const sma2Fifteen = df.sma(responseFifteen, config.sma2, closeFifteen);
              const [rsigainFifteen, rsilossFifteen, rsiFifteen] = df.rsi(
                responseFifteen,
                config.rsi,
                lastCandleFifteen,
              );

              const [mema12Fifteen, mema26Fifteen, msignalFifteen, macdFifteen] = df.macd(
                responseFifteen,
                config.macd.line1,
                config.macd.line2,
                config.macd.signal,
                lastCandleFifteen,
              );
              const [ttr15, tatr15] = df.avgTrueRange(
                responseFifteen,
                config.atr,
                lastCandleFifteen,
              );
              const trFifteen = utils.roundTo(ttr15, 4);
              const atrFifteen = utils.roundTo(tatr15, 4);

              const fifteenArgs = {
                nixtime,
                openFifteen,
                highFifteen,
                lowFifteen,
                closeFifteen,
                tradesFifteen,
                volumeFifteen,
                sma1Fifteen,
                sma2Fifteen,
                rsiFifteen,
                rsigainFifteen,
                rsilossFifteen,
                mema12Fifteen,
                mema26Fifteen,
                msignalFifteen,
                macdFifteen,
                trFifteen,
                atrFifteen,
              };
              // insert data
              db.insert15min(fifteenArgs).catch(console.error);
            })
            .catch(console.error);
        }
      }
    })
    .catch(console.error);
};

exports.DeltaRecord = new DeltaRecord();
