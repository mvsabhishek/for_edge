# applyupdatesSQL.ps1
# Written by Siva Munukutla
# Install windows updates to Windows Servers 2016 with Highly Available SQL Cluster.

# Import Util for external functions
Import-Module C:\patch-mgr\util.ps1

failover_SQL_cluster -toSelf "n"

# Begin installing updates
Write-Host "Installing updates on node $thisNode."


try{
# Install updates
$Installer = New-Object -ComObject Microsoft.Update.Installer
$Installer.Updates = $SearchResult
$Result = $Installer.Install()
}
catch{
    $ErrorMessage = $_
    sendStatus -status "error" -error $ErrorMessage
}

if ($Result.rebootRequired) {
    try{
    # Set registry key to run cleanup script after restart
    $trigger = New-JobTrigger -AtStartup -RandomDelay 00:02:00 -ErrorAction Stop
    Register-ScheduledJob -Trigger $trigger -FilePath C:\patch-mgr\cleanup.ps1 -Name TestStartupScript -ErrorAction Stop

    # Reboot
    sendReboot
    shutdown.exe /t 0 /r
    }catch{
        $ErrorMessage = $_
        sendStatus -status "error" -error $ErrorMessage    
    }
}
else{

    # Reboot is not required
    sendStatus -status "done"
    Write-Host "No reboot required."
}
