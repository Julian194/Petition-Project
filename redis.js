var redis = require('redis');
var client = redis.createClient(process.env.REDIS_URL || {
  host: 'localhost',
  port: 6379
});

client.on('error', function(err) {
  console.log(err);
});

module.exports.setex = function(key, secs, obj){
  return new Promise(function(resolve, reject){
    client.setex(key, secs, obj, function(err,data){
      if (err) {
        console.log(err);
      } else{
        resolve(data)
      }
    })
  })
}

module.exports.get = function(key) {
  return new Promise(function(resolve, reject) {
    client.get(key, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        resolve(data)
      }
    })
  })
}
