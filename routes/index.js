const express = require('express');
const router = express.Router();
const axios = require('axios');
const Shell = require("node-powershell");
const logger = require('../logger').Logger;


// Initiate PowerShell object with unrestricted execution policy
const ps = new Shell({
    executionPolicy: 'Unrestricted',
    noProfile: true
});

// Json data structure containing cluster name and nodes in that cluster
const clusters = {
        'chefsql': ['SQL-Server-1', 'SQL-Server-2']
};

// Get Home Page - Default Express app index page
router.get('/', (req, res, next) => {
    res.render('index', { title: 'Automated Windows Patch Management System' });
});


let mod_clusters = clusters; // modifiable variable to keep track of the unprocessed nodes
let begin_flag = false; // false - Update not begun; true - Update has begun
let nodes_processed = []; // array of nodes where the process applying windows update is successful
let started = []; // array of nodes where the process of applying windows update has been initiated
let restarting = []; // array of nodes which are currently rebooting
let restarted = []; // array of nodes which have rebooted


// Endpoint - /api/begin_updates
// Description - Begin updates on one node each on all SQL Clusters
router.post('/api/begin_updates', (req, res, next) => {
    // check if the process of applying windows updates has begun - if not, begin the process
    let response = {};
    if (!begin_flag) { 
        // Initialize all the data structures
        mod_clusters = clusters;
        let arr = [];
        started = [];
        nodes_processed = [];
        restarting = [];
        restarted = [];
        begin_flag = true
        // Run the PowerShell script that initiates the process of applying patches
        ps.addCommand('cd c:\\chef-repo | & \'C:\\chef-repo\\begin_updates_knife.ps1\'')
        ps.invoke().then((err, res, next) => {
            if(err){
                console.log(err);
            }else{ 
            console.log(res);
            }
        }).catch((err) => {
            console.log(err);
        });

        // Build and send Json response
        Object.keys(mod_clusters).forEach((cluster) => {
            response = {};
            response.Cluster = cluster;
            response.Node = mod_clusters[cluster][0];
            response.Status = "Started";
            arr.push(response);
            started.push(mod_clusters[cluster][0])
        });
        res.json(arr);

    } else {
        // Build and send Json response
        response.Error = "Updates have already begun."
        response.Nodes_Processed = nodes_processed
        response.Updates_Started_On = started
        res.json(response)
    }
});

// Endpoint - /api/restart
// Description - This endpoint is accessed by a node to notify that it has initiated reboot
router.post('/api/restart', (req, res, next) => {   
    if (begin_flag) {
        logger.info(JSON.stringify(req.body))
        let response = {};
        response.Nodes_Processed = nodes_processed
        response.Updates_Started_On = started
        response.Restarting_nodes = restarting
        response.Nodes_restarted = restarted
        // Check if the node is/has been restarted once
        if(req.body.Status == "restart" && !restarting.find((node) => {return node.toUpperCase() == req.body.Node}) && !restarted.find((node) => {return node.toUpperCase() == req.body.Node})){
            restarting.push(req.body.Node);
            response.Restarting_nodes = restarting
            response.Status = "Restarting"
            res.json(response);    
        }
        // check if the node is currently restarting
        else if(req.body.Status == "restart" && restarting.find((node) => {return node.toUpperCase() == req.body.Node}) && !restarted.find((node) => {return node.toUpperCase() == req.body.Node})){
            response.Warning = "Already restarting"
            res.json(response);
        }
        // check if the node has already been restarted
        else if(req.body.Status == "restart" && !restarting.find((node) => {return node.toUpperCase() == req.body.Node}) && restarted.find((node) => {return node.toUpperCase() == req.body.Node})){
            response.Warning = "Already restarted"
            res.json(response);
            }
        else {
            response.Warning = "Action invalid. Please check the request."
            res.json(response);
        }
    }
    else{
        res.json({ "Info": "The process has not been initiated" })
    }
});

// Endpoint - /api/restart_complete
// Description - This endpoint is accessed by a node to notify that it has completed reboot
router.post('/api/restart_complete', (req, res, next) => {
    if (begin_flag) {
        logger.info(JSON.stringify(req.body))
        let response = {};
        response.Nodes_Processed = nodes_processed
        response.Updates_Started_On = started
        response.Restarting_nodes = restarting
        response.Nodes_restarted = restarted

        // check if restart has not been initiated
        if(req.body.Status == "restart_complete" && !restarting.find((node) => {return node.toUpperCase() == req.body.Node}) && !restarted.find((node) => {return node.toUpperCase() == req.body.Node})){
            response.Warning = "Restart not initiated"
            res.json(response);
        }
        // check if the node has been restarted
        else if(req.body.Status == "restart_complete" && !restarting.find((node) => {return node.toUpperCase() == req.body.Node}) && restarted.find((node) => {return node.toUpperCase() == req.body.Node})){
            response.Warning = "Restart already completed once"
            res.json(response);
        }
        // check if the node was being restarted
        else if(req.body.Status == "restart_complete" && restarting.find((node) => {return node.toUpperCase() == req.body.Node}) && !restarted.find((node) => {return node.toUpperCase() == req.body.Node})){
            restarted.push(req.body.Node);
            restarting = restarting.filter(item => {return item.toUpperCase() !== req.body.Node})
            response.Restarting_nodes = restarting
            response.Status = "Restart Complete"
            res.json(response);    
        }
        else {
            response.Warning = "Action invalid. Please check the request."
            res.json(response);
        }
    }
    else{
        res.json({ "Info": "The process has not been initiated" })
    }
});


// Endpoint - /api/update_status
// Description - This endpoint is accessed by a node to update the status be it error or done
router.post('/api/update_status', (req, res, next) => { 
    let response = {};
    logger.info(JSON.stringify(req.body))
    if (begin_flag) {
        // if the status is done, initiate the process of applying Windows Update 
        // on the next node in the cluster this node belongs to.
        if (req.body.Status == "done") {
            if (!nodes_processed.find(item => { return item.Node.toUpperCase() == req.body.Node }) || !nodes_processed.length) {
                nodes_processed.push({ "Node": req.body.Node, "Status": req.body.Status });
                var nodes = mod_clusters[req.body.Cluster].filter((item) => {return item.toUpperCase() !== req.body.Node});
                mod_clusters[req.body.Cluster] = nodes;
                logger.info(JSON.stringify(mod_clusters[req.body.Cluster]))
                started = started.filter(item => {return item.toUpperCase() !== req.body.Node});
                // check if there are more nodes in the cluster that need Windows Update
                if (!(mod_clusters[String(req.body.Cluster)]) || !mod_clusters[String(req.body.Cluster)].length) {
                    response.Cluster = req.body.Cluster
                    response.Status = "Finished updating the cluster"
                    response.Nodes_Unprocessed = mod_clusters
                    response.Nodes_Processed = nodes_processed
                    response.Updates_Started_On = started
                    res.json(response)
                } else {
                    // check if the process has already been initiated on the node picked for updating
                    // if yes, the node would be found in the started array
                    response.Nodes_Unprocessed = mod_clusters
                    response.Nodes_Processed = nodes_processed
                    response.Cluster = req.body.Cluster
                    response.Node = mod_clusters[String(req.body.Cluster)][0]

                    if(!started.find(item => {return item == mod_clusters[String(req.body.Cluster)][0]})){
                        let node_name = mod_clusters[String(req.body.Cluster)][0]
                        ps.addCommand(`cd c:\\chef-repo | & \'C:\\chef-repo\\remote_knife.ps1\' -node \'${node_name}\'`)
                        ps.invoke().then((err, res, next) => {
                        if(err){
                            console.log(err);
                        }}).catch((err) => {
                        console.log(err);
                        });
                        started.push(mod_clusters[String(req.body.Cluster)][0]);
                        response.Status ="started"
                        response.Updates_Started_On = started
                    }else{
                    response.Status = "Already started"
                    }
                    res.json(response)
                }
            } 
            else {
                let stat = nodes_processed.find(item => { return item.Node.toUpperCase() == req.body.Node });
                response.Cluster = req.body.Cluster
                response.Node = req.body.Node
                response.Status = stat.Status
                response.Nodes_Unprocessed = mod_clusters
                response.Nodes_Processed = nodes_processed
                response.Updates_Started_On = started
                response.Message = "Already Processed"
                res.json(response)
            }
        } 
        // if the status is error, make a call to /api/stop_updating endpoint to stop the process
        else if (req.body.Status == "error") {
            logger.error(JSON.stringify(req.body))
            nodes_processed.push({ "Node": req.body.Node, "Status": req.body.Status });
            var nodes = mod_clusters[req.body.Cluster].filter(item => {return item.toUpperCase() !== req.body.Node});
            mod_clusters[req.body.Cluster] = nodes;
            started = started.filter(item => {return item.toUpperCase() !== req.body.Node});
            var reset_url = 'http://workstation.cheftest.edgenuity.com:3000/api/stop_updating'
            axios.post(reset_url)
            .then(() => {
                response.Cluster = req.body.Cluster
                response.Node = req.body.Node
                response.Status = "error"
                response.Message = "Process stopped due to error"
                response.Nodes_Unprocessed = mod_clusters
                response.Nodes_Processed = nodes_processed
                response.Updates_Started_On = started
                res.json(response)
            }).catch(error => {
                console.log(error);
            });
        } else {
            response.Error = "Invalid request"
            response.Nodes_Unprocessed = mod_clusters
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            res.json(response)
        }
    } else {
        res.json({ "Info": "The process has not been initiated" })
    }
});

// Endpoint - /api/
// Description - This endpoint is accessed to get information
//               on the progress of the workflow
router.get('/api/', (req, res, next) => {
    logger.info(JSON.stringify(req.body))
    let response = {};
    response.Nodes_Unprocessed = mod_clusters
    response.Nodes_Processed = nodes_processed
    response.Updates_Started_On = started
    res.json(response)
});

// Endpoint - /api/stop_updating
// Description - This endpoint is accessed by a node or admin to stop the complete workflow
router.post('/api/stop_updating', (req, res, next) => {
    // Stop the process of applying Windows Updates
    logger.info(JSON.stringify(req.body))
    let response = {}
    if(begin_flag){
    begin_flag = false;
    response.Success = "Windows Update workflow has been stopped"
    response.Nodes_Processed = nodes_processed
    response.Updates_Started_On = started
    res.json(response)
    } else{
        res.json({ "Info": "The process has not been initiated" })
    }
});

// Endpoint - /api/uninstall_updates
// Description - This endpoint is accessed to initiate the process of uninstalling updates
router.post('/api/uninstall_updates', (res, req, next) => {
    // TO-DO
    // ....
    res.json({ "Info": "This end point will help uninstall updates" })
});

// Endpoint - /api/update_cluster/:clusterName
// Description - This endpoint is accessed to install updates on a particular cluster
router.post('/api/update_cluster/:clusterName', (req, res, next) => {
    res.json({ "Info": `This end point will help install updates on cluster: ${req.params.clusterName}` })
});


module.exports = router;