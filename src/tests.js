import knob from './knob.js';

document.addEventListener("DOMContentLoaded", function(event) {

    const k1 = new knob(document.getElementById('knob1'), {});
    const k2 = new knob(document.getElementById('knob2'), {center_zero: true, value_min:-100, value_max:100});

    document.getElementById('reconf2').onclick = function() {
        console.log('reconfigure #knob2');
        k2.config = {
            center_zero: false,
            value_min: 0,
            value_max: 10
        };
    };

/*
    let knobs = {};

    // var knobs = document.querySelectorAll('svg.knob');
    [].forEach.call(document.querySelectorAll('svg.knob'), function(element) {
        knobs[element.id] = new knob(element);
        // element.addEventListener("change", function(event) {
        //     document.getElementById('v-' + element.id).innerHTML = event.detail;
        // });
    });

    // var k = new knob(document.getElementById('knob'), {});
    console.log(knobs);
*/

});
