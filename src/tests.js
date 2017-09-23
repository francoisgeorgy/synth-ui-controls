import knob from './knob.js';

document.addEventListener("DOMContentLoaded", function(event) {

    const k1 = new knob(document.getElementById('knob1'), {});
    const k2 = new knob(document.getElementById('knob2'), {center_zero: true, value_min:-100, value_max:100});
    new knob(document.getElementById('knob3'), {zero_at: 90});
    new knob(document.getElementById('knob4'), {
        angle_min: 10,
        angle_max: 350,
        track_radius: 30,
        track_width: 16,
    });
    new knob(document.getElementById('knob5'), {
        linecap: 'butt'
    });
    new knob(document.getElementById('knob6'), {
        background: false,
        cursor: false,
        linecap: 'butt',
        track_bg_width: 20,
        track_width: 20,
        mouse_wheel_acceleration: 20
    });
    const k7 = new knob(document.getElementById('knob7'), {
        background: false,
        cursor_only: true,
        cursor_radius: 30,          // same unit as radius
        cursor_length: 20,
        cursor_width: 10,
        linecap: 'butt',
        track_bg_width: 20,
        mouse_wheel_acceleration: 1
    });
    new knob(document.getElementById('knob8'), {
        background: false,
        // back_color: 'transparent',
        // back_radius: 50,
        track_bg_radius: 48,
        track_bg_width: 2,
        // track_background: false,
        cursor_only: true,
        cursor_radius: 37,          // same unit as radius
        cursor_length: 0,
        cursor_width: 16,
        divisions: 10,
        divisions_radius: 30,          // same unit as radius
        divisions_length: 14,
        divisions_width: 1
    });
    const k9 = new knob(document.getElementById('knob9'), {});
    new knob(document.getElementById('knob10'), {
        angle_min: 0,
        angle_max: 360,
        // background: true,
        back_color: 'transparent',
        back_radius: 48,
        back_border_width: 2,
        track_bg: false,
        cursor: false,
        // track_bg_radius: 40,
        // track_bg_width: 1,
        linecap: 'butt',
        track_radius: 38,
        track_width: 14,
        initial_value: 42
        // track_background: false,
        // cursor_only: true,
        // cursor_radius: 15,          // same unit as radius
        // cursor_length: 30,
        // cursor_width: 10,

    });

    new knob(document.getElementById('knob11'), {
        angle_min: 20,
        angle_max: 340,
        background: false,
        // back_color: 'transparent',
        // back_radius: 48,
        // track_bg: false,
        // cursor: false,
        track_bg_radius: 45,
        track_bg_width: 6,
        linecap: 'butt',
        track_radius: 45,
        track_width: 6,
        initial_value: 42,
        // track_background: false,
        cursor_radius: 25,          // same unit as radius
        cursor_length: 23,
        cursor_width: 6
    });

    new knob(document.getElementById('knob12'), {
        angle_min: 20,
        angle_max: 340,
        back_color: 'transparent',
        back_radius: 26,
        back_border_width: 1,
        track_bg_radius: 30,
        track_bg_width: 2,
        // track_background: false,
        cursor_only: true,
        cursor_radius: 38,          // same unit as radius
        cursor_length: 10,
        cursor_width: 4,
        divisions: 10,
        divisions_radius: 36,          // same unit as radius
        divisions_length: 8,
        divisions_width: 2,
    });

    /*
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
        svg.setAttribute("style","width:100px");
        new knob(svg, {
            zero_at: 90,
            center_zero: true,
            angle_min: 190,
            angle_max: 170
        });
        document.getElementsByTagName('body')[0].appendChild(svg);
    */

    document.getElementById('reconf2').onclick = function() {
        console.log('reconfigure #knob2');
        k2.config = {
            center_zero: false
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
