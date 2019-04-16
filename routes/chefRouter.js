const express = require('express');
const chefRouter = express.Router();
const async = require('async');
const Shell = require("node-powershell");

let output = [];
async function shell(arr){

    const ps = new Shell({
        executionPolicy: 'Unrestricted',
        noProfile: true
      });
    ps.addCommand(arr);
    ps.invoke()
    .then(resp => {
        output.push(resp)
    })
    .catch(err => {
      console.log(err);
    });
}

chefRouter.get('/orgs', (req, res) => {

      var arr = ['echo "Start...."','cd "c:/chef-repo" | knife list clients']
      async (arr) =>{
          for(var val in arr){
          await shell(val)
      }
      res.json({"Success":"Powershell Executed Successfully", "Output": output})
      output = [];
    }
      
});

module.exports = chefRouter;