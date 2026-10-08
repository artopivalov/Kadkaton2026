const NAME_CHARACTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function defaultPlayerName(){
 return 'Ebaboba-'+Array.from({length:2},()=>NAME_CHARACTERS[Math.floor(Math.random()*NAME_CHARACTERS.length)]).join('');
}
