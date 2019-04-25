const express = require('express');
const chefRouter = express.Router();
const async = require('async');
const Shell = require("powershell");

let output = [];


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

let ps = new Shell("echo 'Hello Outside' | Add-Content chef-repolog1.txt")


chefRouter.get('/check', (req, res) => {

  let ps = new Shell("echo 'Hello inside' | Add-Content chef-repolog1.txt ")
console.log("done")
  
});



module.exports = chefRouter;