const express = require('express');
const router = express.Router();
const axios = require('axios');
const Shell = require("node-powershell");

// Json Exchange format - {"Cluster": "Cluster_Name", "Node": "Node_Name", "Status":"Status_Desc"}
/*const clusters = () => {
    return {
        'cluster-1': ['SQL1', 'SQL2'],
        'cluster-2': ['SQL3', 'SQL4', 'SQL5'],
        'cluster-3': ['SQL6', 'SQL7', 'SQL8']
    }
};*/
const ps = new Shell({
    executionPolicy: 'Unrestricted',
    noProfile: true
});

const clusters = {
        'chefsql': ['SQL-SERVER-1', 'SQL-SERVER-2']
};

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', { title: 'Express' });
});


let mod_clusters = clusters;
let begin_flag = false; // false - Update not begun; true - Update has begun
let nodes_processed = [];
let started = [];
let restarting = [];
let restarted = [];

router.post('/api/begin_updates', (req, res, next) => {
    if (!begin_flag) {
        mod_clusters = clusters;
        let response = {};
        let arr = [];
        started = [];
        nodes_processed = [];
        restarting = [];
        restarted = [];
        Object.keys(mod_clusters).forEach((cluster) => {
            ps.addCommand('cd c:\\chef-repo | & \'C:\\chef-repo\\begin_updates_knife.ps1\'')
            ps.invoke().then((err, res, next) => {
                if(err){
                    console.log(err);
                } 
                console.log(res);
            }).catch((err) => {
                console.log(err);
            });

            response = {};
            response.Cluster = cluster;
            response.Node = mod_clusters[cluster][0];
            response.Status = "Started";
            arr.push(response);
            started.push(mod_clusters[cluster][0])
        });
        begin_flag = true;
        res.json(arr);
    } else {
        let resp = {}
        resp.Error = "Updates have already begun."
        resp.Nodes_Processed = nodes_processed
        resp.Updates_Started_On = started
        res.json(resp)
    }
});

router.post('/api/restart', (req, res, next) => {
    if (begin_flag) {
        let response = {};
        if(req.body.Status == "restart" && !restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            restarting.push(req.body.Node);
            response.Status = "Restarting"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);    
        }
        else if(req.body.Status == "restart" && restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            restarting.push(req.body.Node);
            response.Warning = "Already restarting"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
            }
        else if(req.body.Status == "restart" && !restarting.find((node) => {return node == req.body.Node}) && restarted.find((node) => {return node == req.body.Node})){
            restarting.push(req.body.Node);
            response.Warning = "Already restarting"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
            }
        else {
            restarting.push(req.body.Node);
            response.Warning = "Action invalid"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
        }
    }
    else{
        res.json({ "Info": "The process has not been initiated" })
    }
});

router.post('/api/restart_complete', (req, res, next) => {
    let response = {};
    if (begin_flag) {
        if(req.body.Status == "restart_complete" && restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            restarted.push(req.body.Node);
            restarting = restarting.filter(item => {return item !== req.body.Node})
            response.Status = "Restart Complete"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);    
        }
    else if(req.body.Status == "restart_complete" && restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            response.Warning = "Already restarting"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
        }
    else if(req.body.Status == "restart_complete" && !restarting.find((node) => {return node == req.body.Node}) && restarted.find((node) => {return node == req.body.Node})){
            response.Warning = "Already restarting"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
        }
    else if(req.body.Status == "restart_complete" && !restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            response.Warning = "Restart not initiated"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
        }
    else {
            response.Warning = "Action invalid"
            response.Nodes_Processed = nodes_processed
            response.Updates_Started_On = started
            response.Restarting_nodes = restarting
            response.Nodes_restarted = restarted
            res.json(response);
        }
    }
    else{
        res.json({ "Info": "The process has not been initiated" })
    }
});



router.post('/api/update_status', (req, res, next) => { 
    let response = {}; 
    if (begin_flag == true) {
        if (req.body.Status == "done") {
            if (!nodes_processed.find(item => { return item.Node == req.body.Node }) || !nodes_processed.length) {
                nodes_processed.push({ "Node": req.body.Node, "Status": req.body.Status });
                var nodes = mod_clusters[req.body.Cluster].filter((item) => {return item !== req.body.Node});
                mod_clusters[req.body.Cluster] = nodes;
                started = started.filter(item => {return item !== req.body.Node});
                if (!(mod_clusters[String(req.body.Cluster)]) || !mod_clusters[String(req.body.Cluster)].length) {
                    response.Cluster = req.body.Cluster
                    response.Status = "Finished updating the cluster"
                    response.Nodes_Unprocessed = mod_clusters
                    response.Nodes_Processed = nodes_processed
                    response.Updates_Started_On = started
                    res.json(response)
                } else {
                    if(!started.find(item => {return item == mod_clusters[String(req.body.Cluster)][0]})){
                        let node_name =  mod_clusters[String(req.body.Cluster)][0] == "SQL-SERVER-2" ? "SQL-Server-2": "SQL-Server-2"; 
                        ps.addCommand(`cd c:\\chef-repo | & \'C:\\chef-repo\\remote_knife.ps1\' -node \'${node_name}\'`)
                        ps.invoke().then((err, res, next) => {
                        if(err){
                        console.log(err);
                        } 
                        console.log(res);
                        }).catch((err) => {
                        console.log(err);
                        });
                    started.push(mod_clusters[String(req.body.Cluster)][0]);
                    }
                    response.Cluster = req.body.Cluster
                    response.Node = mod_clusters[String(req.body.Cluster)][0]
                    response.Status = "started"
                    response.Nodes_Unprocessed = mod_clusters
                    response.Nodes_Processed = nodes_processed
                    response.Updates_Started_On = started
                    res.json(response)
                }
            } else {
                let stat = nodes_processed.find(item => { return item.Node == req.body.Node });
                response.Cluster = req.body.Cluster
                response.Node = req.body.Node
                response.Status = stat.Status
                response.Nodes_Unprocessed = mod_clusters
                response.Nodes_Processed = nodes_processed
                response.Updates_Started_On = started
                res.json(response)
            }
        } else if (req.body.Status == "error") {
            nodes_processed.push({ "Node": req.body.Node, "Status": req.body.Status });
            var nodes = mod_clusters[req.body.Cluster].filter(item => {return item !== req.body.Node});
            mod_clusters[req.body.Cluster] = nodes;
            started = started.filter(item => {return item !== req.body.Node});
            var reset_url = 'http://workstation.cheftest.edgenuity.com:3000/api/reset_update_process'
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

router.get('/api/', (req, res, next) => {
    let response = {};
    response.Nodes_Unprocessed = mod_clusters
    response.Nodes_Processed = nodes_processed
    response.Updates_Started_On = started
    res.json(response)
});

router.post('/api/reset_update_process', (req, res, next) => {
    // Stop Update Process
    begin_flag = false;
    response.Success = "Windows Update workflow reset"
    response.Nodes_Processed = nodes_processed
    response.Updates_Started_On = started
    res.json(response)
});

router.post('/api/uninstall_updates', (res, req, next) => {
    res.json({ "Info": "This end point will help uninstall updates" })
});

router.post('/api/update_cluster/:clusterName', (req, res, next) => {
    res.json({ "Info": `This end point will help install updates on cluster: ${req.params.clusterName}` })
});

module.exports = router;