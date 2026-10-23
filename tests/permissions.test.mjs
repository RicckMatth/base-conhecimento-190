import test from 'node:test';
import assert from 'node:assert/strict';
import {ADMIN_LOGIN,canTestGemini} from '../lib/permissions.js';
test('diagnóstico Gemini é exclusivo do administrador principal',()=>{
 assert.equal(canTestGemini({username:ADMIN_LOGIN,role:'admin'}),true);
 for(const user of [null,{}, {username:'outro.admin',role:'admin'}, {username:ADMIN_LOGIN,role:'user'}, {username:ADMIN_LOGIN,role:'admin',must_change_password:true}, {username:ADMIN_LOGIN,role:'admin',mustChangePassword:true}])assert.equal(canTestGemini(user),false);
});
