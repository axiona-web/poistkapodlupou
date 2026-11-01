<?php
declare(strict_types=1);
require __DIR__.'/../server/AnthropicReader.php';
function rejected(callable $call): void { try { $call(); } catch (Throwable $e) { return; } throw new RuntimeException('Expected rejection'); }
rejected(fn()=>AnthropicReader::requestBody('<script>bad</script>','application/pdf','pzp','test'));
rejected(fn()=>AnthropicReader::requestBody('','application/pdf','pzp','test'));
rejected(fn()=>AnthropicReader::parseResponse(['stop_reason'=>'max_tokens']));
rejected(fn()=>AnthropicReader::parseResponse(['stop_reason'=>'end_turn','content'=>[['type'=>'text','text'=>'{"fields":[{"label":"test","value":"1","page":0,"evidence":"x"}],"missing":[]}']]]));
$parsed=AnthropicReader::parseResponse(['stop_reason'=>'end_turn','content'=>[['type'=>'text','text'=>'{"fields":[{"label":"Poistné","value":"100 EUR ročne","page":1,"evidence":"Ročné poistné: 100 EUR"}],"missing":["Poistné podmienky"]}']]]);
if ($parsed['requires_confirmation']!==true || count($parsed['fields'])!==1) throw new RuntimeException('Unexpected result');
echo "PASS: file validation, truncated response, evidence validation, confirmation required\n";
