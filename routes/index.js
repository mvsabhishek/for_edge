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
        res.json({ "Error": "Updates have already begun.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started });
    }
});

router.post('/api/restart', (req, res, next) => {
    if (begin_flag) {
        if(req.body.Status == "restart" && !restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            restarting.push(req.body.Node);
            res.json({ "Status": "Restarting", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted  });    
        }
        else if(req.body.Status == "restart" && restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
                res.json({ "Warning": "Already restarting.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
            }
        else if(req.body.Status == "restart" && !restarting.find((node) => {return node == req.body.Node}) && restarted.find((node) => {return node == req.body.Node})){
                res.json({ "Warning": "Already restarted.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
            }
        else {
        res.json({ "Warning": "Action invalid. Please check the request.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
        }
    }
    else{
        res.json({ "Info": "The process has not been initiated" })
    }
});

router.post('/api/restart_complete', (req, res, next) => {
    if (begin_flag) {
        if(req.body.Status == "restart_complete" && restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            restarted.push(req.body.Node);
            restarting = restarting.filter(item => {return item !== req.body.Node})
            res.json({ "Status": "Restart Complete", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted  });    
        }
    else if(req.body.Status == "restart_complete" && restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            res.json({ "Warning": "Already restarting.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
        }
    else if(req.body.Status == "restart_complete" && !restarting.find((node) => {return node == req.body.Node}) && restarted.find((node) => {return node == req.body.Node})){
            res.json({ "Warning": "Already restarted.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
        }
    else if(req.body.Status == "restart_complete" && !restarting.find((node) => {return node == req.body.Node}) && !restarted.find((node) => {return node == req.body.Node})){
            res.json({ "Warning": "Restart not initiated.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
        }
    else {
        res.json({ "Warning": "Action invalid. Please check the request.", "Nodes_Processed": nodes_processed, "Updates_Started_On": started, "Restarting_nodes": restarting, "Nodes_restarted": restarted });
        }
    }
    else{
        res.json({ "Info": "The process has not been initiated" })
    }
});



router.post('/api/update_status', (req, res, next) => {  
    if (begin_flag == true) { 
        if (req.body.Status == "done") {
            if (!nodes_processed.find(item => { return item.Node == req.body.Node }) || !nodes_processed.length) {
                nodes_processed.push({ "Node": req.body.Node, "Status": req.body.Status });
                var nodes = mod_clusters[req.body.Cluster].filter((item) => {return item !== req.body.Node});
                mod_clusters[req.body.Cluster] = nodes;
                started = started.filter(item => {return item !== req.body.Node});
                if (!(mod_clusters[String(req.body.Cluster)]) || !mod_clusters[String(req.body.Cluster)].length) {
                    res.json({ "Cluster": req.body.Cluster, "Status": "Finished updating the cluster", "Nodes_Unprocessed": mod_clusters, "Nodes_Processed": nodes_processed, "Updates_Started_On": started })
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
                    res.json({ "Cluster": req.body.Cluster, "Node": mod_clusters[String(req.body.Cluster)][0], "Status": "started", "Nodes_Unprocessed": mod_clusters, "Nodes_Processed": nodes_processed, "Updates_Started_On": started })
                }
            } else {
                let stat = nodes_processed.find(item => { return item.Node == req.body.Node });
                res.json({ "Cluster": req.body.Cluster, "Node": req.body.Node, "Status": stat.Status, "Nodes_Unprocessed": mod_clusters, "Nodes_Processed": nodes_processed, "Updates_Started_On": started })
            }
        } else if (req.body.Status == "error") {
            nodes_processed.push({ "Node": req.body.Node, "Status": req.body.Status });
            var nodes = mod_clusters[req.body.Cluster].filter(item => {return item !== req.body.Node});
            mod_clusters[req.body.Cluster] = nodes;
            started = started.filter(item => {return item !== req.body.Node});
            axios.post('http://workstation.cheftest.edgenuity.com:3000/api/reset_update_process')
            .then(response => {
                res.json({ "Cluster": req.body.Cluster, "Node": req.body.Node, "Status": "Error", "Message" : "Process stopped due to error","Nodes_Unprocessed": mod_clusters, "Nodes_Completed": nodes_processed, "Updates_Started_On": started });            })
            .catch(error => {
                console.log(error);
            });
        } else {
            res.json({ "Error": "Invalid Request", "Nodes_Unprocessed": mod_clusters, "Nodes_Completed": nodes_processed, "Updates_Started_On": started });
        }
    } else {
        res.json({ "Info": "The process has not been initiated" })
    }
});

router.get('/api/', (req, res, next) => {
    res.json({ "Nodes_Unprocessed": mod_clusters, "Nodes_Processed": nodes_processed, "Updates_Started_On": started });
});

router.post('/api/reset_update_process', (req, res, next) => {
    // Stop Update Process
    begin_flag = false;
    res.json({ "Success": "Update Process Reset.", "Nodes_Updated": nodes_processed, "Updates_Started_On": started });
});

router.post('/api/uninstall_updates', (res, req, next) => {
    res.json({ "Info": "This end point will help uninstall updates" })
});

router.post('/api/update_cluster/:clusterName', (req, res, next) => {
    res.json({ "Info": `This end point will help install updates on cluster: ${req.params.clusterName}` })
});

module.exports = router;