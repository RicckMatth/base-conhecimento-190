import test from 'node:test';
import assert from 'node:assert/strict';
import { CEREBRO_190 } from '../lib/cerebro.js';
import { EXTRA_RULES } from '../lib/extras.js';
import { passwordHash,passwordVerify,ADMIN_LOGIN,validLogin } from '../lib/security.js';
test('cérebro roda no Node sem window',()=>{assert.ok(CEREBRO_190.regrasBase.length>5);});
test('identifica cenários de agressão e roubo como hipóteses',()=>{
  for(const relato of ['Uma mulher está sendo agredida pelo marido dentro de casa','Dois homens armados anunciaram assalto e roubaram meu celular']){
    const out=CEREBRO_190.analisarEntrada(relato,EXTRA_RULES);
    assert.equal(out?.tipo,'classificacao');
    assert.ok(out.principal?.officialNature);
  }
});
test('inclui regras adicionais de cenários',()=>{
  const out=CEREBRO_190.analisarEntrada('Um apartamento está pegando fogo com fumaça e pessoas dentro do prédio',EXTRA_RULES);
  assert.equal(out?.tipo,'classificacao');
  assert.ok(EXTRA_RULES.length>=8);
});
test('senhas scrypt têm sal aleatório e validação segura',async()=>{
  const a=await passwordHash('senha-grande-de-teste'),b=await passwordHash('senha-grande-de-teste');
  assert.notEqual(a,b);
  assert.equal(await passwordVerify('senha-grande-de-teste',a),true);
  assert.equal(await passwordVerify('senha-incorreta',a),false);
});
test('usuário administrador reservado e nomes verificados',()=>{
  assert.equal(ADMIN_LOGIN,'pm-civil.bandeira');
  assert.equal(validLogin('usuario.teste'),true);
  assert.equal(validLogin('usuario+admin'),false);
});
