# cleanup.ps1
# Written by Siva Munukutla
# This script removes Scheduled job, tests the SQL Server Service 
# on the Highly Available SQL Cluster node and sends makes an API
# call to the Patching Engine to update status.

Import-Module C:\patch-mgr\util.ps1


try{
sendReboot_complete
Unregister-ScheduledJob TestStartupScript -ErrorAction Stop
failover_SQL_cluster -toSelf "y"
$resp = checkServiceStatus -serviceName "MSSQLSERVER"
if($resp -eq "Running"){
    sendStatus -status "done" -message "Updates installed"
}
}
catch{
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}

