cd C:\chef-repo
$nodes = @("SQL-SERVER-2","SQL-SERVER-1", "PUSH-TEST")
For($i = 0; $i -lt $nodes.Length; $i++){
    knife node show $nodes[$i] | Add-Content C:\chef-repo\log.txt| Out-Null
}