const config = require('../config');
const client = require('../dbconnection');
const utils = require('../utils');

/* REDIS data structure
Hash BitMEX:XBTUSD:1min:timestamp (with all the fields)
Ordered Set BitMEX:XBTUSD:1min (key 'timestamp' value 'timestamp')

use ordered set to range search by time for removal and filter functions
*/

const bitmex1MinPrefix = config.bitmex1MinPrefix; // eslint-disable-line
const bitmex5MinPrefix = config.bitmex5MinPrefix; // eslint-disable-line
const bitmex15MinPrefix = config.bitmex15MinPrefix; // eslint-disable-line

client.on('error', (err) => {
  console.error(`DB Error. Is DB available? ${err}`);
  throw err;
});

const DeltaDB = function DeltaDB() {};
// FIXME should get last 101 records
DeltaDB.prototype.get1MinLast100 = function get1MinLast100() {
  return new Promise((resolve, reject) => {
    const endTime = new Date().getTime();
    const startTime = endTime - 6060000; // 101*60*1000 (51 minutes in millisecs)

    const args = [bitmex1MinPrefix, startTime, endTime];

    // eslint-disable-next-line
    client.zrangebyscore(args, (zerr, zresponse) => {
      if (zerr) return reject(zerr);
      const result = [];
      (function get1MinHashes() {
        const record = zresponse.splice(0, 1)[0];

        // eslint-disable-next-line
        client.hgetall(`${bitmex1MinPrefix}:${record}`, (err, response) => {
          if (err) return reject(err);
          if (zresponse.length === 0) {
            result.push(response);
            return resolve(result);
          }
          result.push(response);
          setTimeout(get1MinHashes, 0);
          // async iteration, using this instead of tail recursion to prevent stack blowout
        });
      }());
    });
  });
};

DeltaDB.prototype.get5MinLast100 = function get5MinLast100() {
  return new Promise((resolve, reject) => {
    const endTime = new Date().getTime();
    const startTime = endTime - 30300000; // 101*5*60*1000 (255 minutes in millisecs)
    const args = [bitmex5MinPrefix, startTime, endTime];

    // eslint-disable-next-line
    client.zrangebyscore(args, (zerr, zresponse) => {
      if (zerr) return reject(zerr);

      const result = [];

      (function get5MinHashes() {
        const record = zresponse.splice(0, 1)[0];

        // eslint-disable-next-line
        client.hgetall(`${bitmex5MinPrefix}:${record}`, (err, response) => {
          if (err) return reject(err);
          if (zresponse.length === 0) {
            result.push(response);
            return resolve(result);
          }
          result.push(response);
          setTimeout(get5MinHashes, 0);
          // async iteration, using this instead of tail recursion to prevent stack blowout
        });
      }());
    });
  });
};

DeltaDB.prototype.get15MinLast100 = function get15MinLast100() {
  return new Promise((resolve, reject) => {
    const endTime = new Date().getTime();
    const startTime = endTime - 90900000; // 101*15*60*1000 (765 minutes in millisecs
    const args = [bitmex15MinPrefix, startTime, endTime];

    // eslint-disable-next-line
    client.zrangebyscore(args, (zerr, zresponse) => {
      if (zerr) return reject(zerr);

      const result = [];

      (function get15MinHashes() {
        const record = zresponse.splice(0, 1)[0];

        // eslint-disable-next-line
        client.hgetall(`${bitmex15MinPrefix}:${record}`, (err, response) => {
          if (err) return reject(err);
          if (zresponse.length === 0) {
            result.push(response);
            return resolve(result);
          }
          result.push(response);
          setTimeout(get15MinHashes, 0);
          // async iteration, using this instead of tail recursion to prevent stack blowout
        });
      }());
    });
  });
};

DeltaDB.prototype.insert1min = function insert1Min(args) {
  return new Promise((resolve, reject) => {
    const {
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
    } = args;

    const timestamp = nixtime;
    const tvwap = vwap === null ? 'null' : utils.roundTo(vwap, config.significant);

    const inargs = [
      `${bitmex1MinPrefix}:${timestamp}`,
      'timestamp',
      timestamp,
      'open',
      open,
      'high',
      high,
      'low',
      low,
      'close',
      close,
      'trades',
      trades,
      'volume',
      volume,
      'vwap',
      tvwap,
      'sma1',
      sma1,
      'sma2',
      sma2,
      'rsi',
      rsi,
      'rsiavggain',
      rsiavggain,
      'rsiavgloss',
      rsiavgloss,
      'mema12',
      mema12,
      'mema26',
      mema26,
      'msignal',
      msignal,
      'macd',
      macd,
      'tr',
      tr,
      'atr',
      atr,
    ];
    // args for sorted set
    const zargs = [`${bitmex1MinPrefix}`, `${timestamp}`, timestamp];
    // args for pubsub
    const pargs = [`${bitmex1MinPrefix}:pubsub`, timestamp];

    const t = new Date(timestamp);
    const tTime = t.toISOString();
    console.log(`${tTime}\t${open}\t${high}\t${low}\t${close}\t${trades}\t${volume}\t${sma1}\t${sma2}\t${rsi}\t${macd}\t${tr}\t${atr}`);

    client
      .multi()
      .hmset(inargs)
      .zadd(zargs)
      .publish(pargs)
      .exec((err, replies) => {
        if (err) reject(err);
        resolve(replies);
      });
  });
};

DeltaDB.prototype.insert5min = function insert5min(args) {
  return new Promise((resolve, reject) => {
    const {
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
    } = args;

    const timestamp = nixtime;

    const inargs = [
      `${bitmex5MinPrefix}:${timestamp}`,
      'timestamp',
      timestamp,
      'open',
      openFive,
      'high',
      highFive,
      'low',
      lowFive,
      'close',
      closeFive,
      'trades',
      tradesFive,
      'volume',
      volumeFive,
      'sma1',
      sma1Five,
      'sma2',
      sma2Five,
      'rsi',
      rsiFive,
      'rsiavggain',
      rsigainFive,
      'rsiavgloss',
      rsilossFive,
      'mema12',
      mema12Five,
      'mema26',
      mema26Five,
      'msignal',
      msignalFive,
      'macd',
      macdFive,
      'tr',
      trFive,
      'atr',
      atrFive,
    ];
    // args for sorted set
    const zargs = [`${bitmex5MinPrefix}`, `${timestamp}`, timestamp];
    // args for pubsub
    const pargs = [`${bitmex5MinPrefix}:pubsub`, timestamp];

    const t = new Date(timestamp);
    const tTime = t.toISOString();
    console.log('----------- 5 min -----------');
    console.log(`${tTime}\t${openFive}\t${highFive}\t${lowFive}\t${closeFive}\t${tradesFive}\t${volumeFive}\t${sma1Five}\t${sma2Five}\t${rsiFive}\t${macdFive}\t${trFive}\t${atrFive}`);
    console.log('-----------------------------');

    client
      .multi()
      .hmset(inargs)
      .zadd(zargs)
      .publish(pargs)
      .exec((err, replies) => {
        if (err) reject(err);
        resolve(replies);
      });
  });
};

DeltaDB.prototype.insert15min = function insert15min(args) {
  return new Promise((resolve, reject) => {
    const {
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
    } = args;

    const timestamp = nixtime;

    const inargs = [
      `${bitmex15MinPrefix}:${timestamp}`,
      'timestamp',
      timestamp,
      'open',
      openFifteen,
      'high',
      highFifteen,
      'low',
      lowFifteen,
      'close',
      closeFifteen,
      'trades',
      tradesFifteen,
      'volume',
      volumeFifteen,
      'sma1',
      sma1Fifteen,
      'sma2',
      sma2Fifteen,
      'rsi',
      rsiFifteen,
      'rsiavggain',
      rsigainFifteen,
      'rsiavgloss',
      rsilossFifteen,
      'mema12',
      mema12Fifteen,
      'mema26',
      mema26Fifteen,
      'msignal',
      msignalFifteen,
      'macd',
      macdFifteen,
      'tr',
      trFifteen,
      'atr',
      atrFifteen,
    ];
    // args for sorted set
    const zargs = [`${bitmex15MinPrefix}`, `${timestamp}`, timestamp];
    // args for pubsub
    const pargs = [`${bitmex15MinPrefix}:pubsub`, timestamp];

    const t = new Date(timestamp);
    const tTime = t.toISOString();
    console.log('---------- 15 min -----------');
    console.log(`${tTime}\t${openFifteen}\t${highFifteen}\t${lowFifteen}\t${closeFifteen}\t${tradesFifteen}\t${volumeFifteen}\t${sma1Fifteen}\t${sma2Fifteen}\t${rsiFifteen}\t${macdFifteen}\t${trFifteen}\t${atrFifteen}`);
    console.log('-----------------------------');

    client
      .multi()
      .hmset(inargs)
      .zadd(zargs)
      .publish(pargs)
      .exec((err, replies) => {
        if (err) reject(err);
        resolve(replies);
      });
  });
};

exports.DeltaDB = new DeltaDB();
