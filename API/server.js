//Modules
const express = require('express');
const app = express();
var elasticsearch = require('elasticsearch');

/*app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
});*/

//Connection to elasticsearch
var client = new elasticsearch.Client( {
  hosts: [
    '127.0.0.1:9200'
  ]
});

//Function to get all populate cars models from caradisiac with node-car-api, do this part only one time
function get() {
  const {getBrands} = require('node-car-api');
  const {getModels} = require('node-car-api');
  var allCars = [];

  async function getAllBrands () {
    const brands = await getBrands();
    return brands;
  }

  async function getBrandModels (brand, callback) {
    console.log('\nBrand : ' + brand)
    const models = await getModels(brand);

    if(models.length == 0) {
      console.log("-> 0 result")
    }
    else {
      models.forEach((model) => {
        console.log("-> " + model.model);
        model.volume = Number(model.volume); //convert volume into a number
        allCars.push(model);
      })
    }
    setTimeout(() => {
      callback();
    }, 500);
  }

  getAllBrands().then(function(brands) {
      brands.reduce((promise, item) => {
        return promise.then(() =>  new Promise((resolve) => {
          getBrandModels(item, resolve)
        }))
      }, Promise.resolve())
      .then(() => {
        //Push each model into elasticsearch
        allCars.forEach((car, index) => {
          setTimeout(() => {
            client.index({
              index: 'caradisiac',
              id: car.uuid,
              type: 'model',
              body: car
            },function(err,resp,status) {
              console.log(resp);
            });
          }, index*5)
        })
      })
  })
}

//API routes
//This route execute the function get() to get all populate cars from
//caradisiac and to push them on elasticsearch
app.get('/populate', (req, res) => {
  //delete all models before reindexing the new models
  //UNCOMMENT THIS PART IF YOU HAVE CALL THIS AT LEAST ONE TIME BEFORE
  /*client.indices.delete({index: 'caradisiac'},function(err, resp, status) {
    console.log("delete", resp);
  });*/
  res.send({'populate': 'working... could be long...'})
  get();
});
//This route return all the suv order by volume bigger to lower
app.get('/suv', (req, res) => {
    client.search({
    index: 'caradisiac',
    type: 'model',
    body: {
      "sort": [
        { "volume":   { "order": "desc" }},
      ]
    }
  },function (error, response, status) {
      if (error){
        res.send({'error': error})
      }
      else {
        res.send(response.hits.hits)
      }
  });
});
//This route return the 50 first suv order by volume bigger to lower with the volume
//larger than the volume given by the user in parameter
app.get('/suv/minVolume/:minVolume', (req, res) => {
  const volumeMin = req.params.minVolume;
    client.search({
    index: 'caradisiac',
    type: 'model',
    body: {
      "from" : 0, "size" : 50,
    	"query": {
    		"range": {
        		"volume": {
        			"gte": volumeMax
        		}
        	}
    	},
        "sort": [
              { "volume":   { "order": "desc" }}
        	]
    }
  },function (error, response, status) {
      if (error){
        res.send({'error': error})
      }
      else {
        res.send(response.hits.hits)
      }
  });
});
//This route return the 50 first suv order by volume bigger to lower with the volume
//lower than the volume given by the user in parameter
app.get('/suv/maxVolume/:maxVolume', (req, res) => {
  const volumeMax = req.params.maxVolume;
    client.search({
    index: 'caradisiac',
    type: 'model',
    body: {
      "from" : 0, "size" : 50,
    	"query": {
    		"range": {
        		"volume": {
        			"lte": volumeMax
        		}
        	}
    	},
        "sort": [
              { "volume":   { "order": "desc" }}
        	]
    }
  },function (error, response, status) {
      if (error){
        res.send({'error': error})
      }
      else {
        res.send(response.hits.hits)
      }
  });
});

//Start the server
app.listen(3000);

console.log('Server started on port ' + 3000);
