# checkforupdates.ps1
# Written by Siva Munukutla
# This script sets up updates if not already setup 
# and calls the applyupdatessql.ps1 script

Import-Module C:\patch-mgr\util.ps1

#Define update criteria.

$Criteria = "IsInstalled=0"


try{
# Search for relevant updates.
$Searcher = New-Object -ComObject Microsoft.Update.Searcher
$SearchResult = $Searcher.Search($Criteria).Updates

# If no update is found
if($SearchResult.Count -eq 0){
Write-Host "System is up to date. No updates installed."
sendStatus -status "done" -message "Node up-to-date"
Exit
}
else{
#Download updates.
<#
$Session = New-Object -ComObject Microsoft.Update.Session -ErrorAction Stop

$Downloader = $Session.CreateUpdateDownloader() 

$Downloader.Updates = $SearchResult

$Downloader.Download() #>

& 'C:\patch-mgr\applyupdatessql.ps1'
}
}
catch{
    $ErrorMessage = $_
    $ErrorMessage | Add-Content C:\patch-mgr\testlog.txt
    sendStatus -status "error" -error $ErrorMessage
}

