# util.ps1
# Written by Siva Munukutla
# Utility variables and functions


# Get Hostname
$thisNode = Get-Content env:COMPUTERNAME

# Function to perform failover

function failover_SQL_cluster{
param([string] $toSelf = "n")

try{
# Check if the Host is part of an SQL Cluster
$clusterInfo = Get-ClusterNode | where {$_.Name -eq $thisNode} |Select cluster, name  -ErrorAction Stop

} catch {
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}

if($clusterInfo){

try{
Get-ClusterGroup | Where-Object {$_.IsCoreGroup -eq $false} | Select-Object Name | ForEach-Object {if($_.Name -match 'SQL[a-z]'){$clusterName = $_.Name}}  -ErrorAction Stop
}
catch{

    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage

}
# Write-Host "The cluster role for SQL Server is " $clusterName
} 
else{ 
sendStatus -status "error" -error "$thisNode is not part of a cluster."
Exit
}

try{
# Check if this node is active (owner) on the cluster 
$activeNode = Get-ClusterGroup -Name $clusterName |Select OwnerNode -unique | %{$_.OwnerNode}  -ErrorAction Stop
}
catch{
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}
if(($toSelf -eq "y") -or ($toSelf -eq "Y")){
Write-Host "Failing over. Please wait..." 
try{
    Move-ClusterGroup -Name $clusterName -Node $thisNode | Out-Null  -ErrorAction Stop
    Write-Host "Success. $thisNode owns the Cluster Group $clusterName"
}
catch{
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}

}
else{
# Perform failover to any node if this node is the owner
if($activeNode -eq $thisNode){

    Write-Host "Failing over. Please wait..." 
try{
    Move-ClusterGroup -Name $clusterName | Out-Null  -ErrorAction Stop
    Write-Host "Success. $thisNode does not own the Cluster Group $clusterName"
}
catch{
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}
}
} 
}


# Function to send status update to Patching Engine

function sendStatus{
param([string] $status, [string] $error = "No Error", [string] $message = "")

try{
$body = @{
"Cluster"= Get-Cluster | Select Name | %{$_.Name};
"Node"=$thisNode;
"Status"=$status;
"Error" = $error;
"Message" = $message;
}

$uri = "https://workstation.cheftest.edgenuity.com:3000/api/update_status"

# Send status update to Patching Engine
Invoke-WebRequest -Method Post -Body ($body|ConvertTo-Json) -URI $uri -ContentType "application/json"
}
catch{
    Write-Host "HTTP REQUEST FAILED. ERROR: "
    Write-Host $_
}
}


function sendReboot{

try{

$body = @{
"Cluster"= Get-Cluster | Select Name | %{$_.Name};
"Node"=$thisNode;
"Status" = "restart";
}

$uri = "http://workstation.cheftest.edgenuity.com:3000/api/restart"

# Send status update to Patching Engine
Invoke-WebRequest -Method Post -Body ($body|ConvertTo-Json) -URI $uri -ContentType "application/json"
}
catch{
    Write-Host "HTTP REQUEST FAILED. ERROR: "
    Write-Host $_
}
}


function sendReboot_Complete{

try{

$body = @{
"Cluster"= Get-Cluster | Select Name | %{$_.Name};
"Node"=$thisNode;
"Status"= "restart_complete";
}

$uri = "http://workstation.cheftest.edgenuity.com:3000/api/restart_complete"

# Send status update to Patching Engine
Invoke-WebRequest -Method Post -Body ($body|ConvertTo-Json) -URI $uri -ContentType "application/json"
}
catch{
    Write-Host "HTTP REQUEST FAILED. ERROR: "
    Write-Host $_
}
}



function checkServiceStatus {

param([string] $serviceName)
try{
$service = Get-Service -Name $serviceName 
}
catch{
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}
return $service.Status
}