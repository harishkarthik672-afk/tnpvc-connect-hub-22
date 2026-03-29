$contractorFile = 'd:\html practice\contractor.html'
$labourFile = 'd:\html practice\labour.html'

if (Test-Path $contractorFile) {
    $content = [System.IO.File]::ReadAllText($contractorFile)
    $content = $content.Replace('➕ Post New Job', 'Post New Job')
    $content = $content.Replace('👥 View Jobs', 'View Jobs')
    $content = $content.Replace('✅ Mark as Completed', 'Mark as Completed')
    $content = $content.Replace('🎉 Work Completed', 'Work Completed')
    $content = $content.Replace('🔒 POST JOB (LOCKED)', 'POST JOB (LOCKED)')
    [System.IO.File]::WriteAllText($contractorFile, $content)
}

if (Test-Path $labourFile) {
    $content = [System.IO.File]::ReadAllText($labourFile)
    $content = $content.Replace('🔒 Subscription Required', 'Subscription Required')
    $content = $content.Replace('✅ Booked & Contacted', 'Booked & Contacted')
    $content = $content.Replace('<span style="font-size:16px; margin-right:6px;">📱</span> Book & WhatsApp Contractor', 'Book & WhatsApp Contractor')
    [System.IO.File]::WriteAllText($labourFile, $content)
}
