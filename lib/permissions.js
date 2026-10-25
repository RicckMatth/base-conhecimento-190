export const ADMIN_LOGIN='pm-civil.bandeira';
// A role alone does not grant access to the owner's provider diagnostic.
export function canTestGemini(user){
 return Boolean(user&&user.username===ADMIN_LOGIN&&user.role==='admin'&&!user.must_change_password&&!user.mustChangePassword);
}


export const canReviewQuality=canTestGemini;
