"use strict";

var MongoClient = require("mongodb").MongoClient
  , assert = require('assert');
// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname, details set in .env
var url = 'mongodb://'+ process.env.USER + ':' + process.env.PASS + '@ds235768.mlab.com:35768/dboydgit-fcc';
var db;
var collection;
var apiURL = "https://www.googleapis.com/customsearch/v1";
var https = require("https");
var StringDecoder = require('string_decoder').StringDecoder;

exports.getImg = function(req, response) {
  // get the search term and set api params
  var term = req.params[0];
  collection.insert({term:term});
  var offset = Number(req.query.offset)+1 || 1;
  // console.log(offset);
  var cx = process.env.CX;
  var key = process.env.S_KEY;
  var results;
  // submit to google api
  https.get(apiURL + "?q=" + term + "&cx=" + cx + "&key=" + key + "&start=" + offset, (res, err) => {
    // console.log('statusCode:', res.statusCode);
    // console.log('headers:', res.headers);
    var decoder = new StringDecoder('utf8');
    var strd = '';

    res.on('data', (chunk) => {
      strd += decoder.write(chunk);
      // JSON.parse(d.toString());
      // var results = formatResults(strd);
    });
    
    res.on("end", () => {
      if(err) response.end(err);
      else{
        results = formatResults(strd);
        response.end(JSON.stringify(results));
      }
    });
  });
}

// helper function for safe JSON access - unpredicable google api results
function getSafe(fn, defaultVal) {
    try {
        return fn();
    } catch (e) {
        return defaultVal;
    }
}
            
function formatResults(data) {
  var jsondata = JSON.parse(data);
  try {
    var items = jsondata.items;
    var result = [];
    var i = 0;
    for (var item of items) {
      //console.log(item);
      var url = getSafe(() => item.pagemap.metatags[0]["og:image"], 'Not Available');
      var snip = getSafe(() => item.snippet, 'Not Available');
      var page = getSafe(() => item.link, 'Not Available');
      result[i] = {
        url: url,
        snippet: snip,
        pageURL: page
      }
      i++;
    }
    return result;
  } catch (e) {
    return {Error: "Too many API calls today... Try again tomorrow"};
  }
}

// function to disply recent searches
exports.list = async function(req, res) {
  var recents = [];
  // return the recents list as response body...
  const docs = await collection.find({}).sort({_id:-1}).limit(10).toArray();
  var i = 1;
  for (var doc of docs) {
    recents.push({[i]:doc.term});
    i++;
  }
  res.end(JSON.stringify(recents));                          
}

exports.connect = function() {
  // connect to db
  MongoClient.connect(url, function(err, client) {
    assert.equal(null, err);
    console.log("Connected successfully to db server");
    db = client.db('dboydgit-fcc');
    collection = db.collection('recents');
  });
}