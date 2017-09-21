import knob from './knob.js';

console.log(knob);

document.addEventListener("DOMContentLoaded", function(event) {
    var k = new knob(document.getElementById('knob'), {});
    console.log(k);
});
