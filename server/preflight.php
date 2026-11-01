<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$checks = ['PHP 8.2+'=>PHP_VERSION_ID>=80200];
foreach (['curl','fileinfo','json','openssl'] as $extension) $checks[$extension]=extension_loaded($extension);
$checks['API key configured']=(bool)getenv('ANTHROPIC_API_KEY');
$checks['Model configured']=(bool)getenv('ANTHROPIC_MODEL');
foreach ($checks as $name=>$ok) echo ($ok?'OK':'MISSING').' '.$name.PHP_EOL;
exit(in_array(false,$checks,true)?1:0);
