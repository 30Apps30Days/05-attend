function noop() {}

function bindEvents(thisArg, events) {
   Object.keys(events).forEach(function (selector) {
        Object.keys(events[selector]).forEach(function (event) {
            var handler = events[selector][event].bind(thisArg);
            if('document' === selector) {
                document.addEventListener(event, handler, false);
            } else if ('window' === selector) {
                window.addEventListener(event, handler, false);
            } else {
                document.querySelectorAll(selector).forEach(function (dom) {
                    dom.addEventListener(event, handler, false);
                });
            }
        });
    }); // all events bound
}

function f(name, params) {
  params = Array.prototype.slice.call(arguments, 1, arguments.length);
  return name + '(' + params.join(', ') + ')';
}

// https://en.wikipedia.org/wiki/Points_of_the_compass
var CARDINAL_POINTS = {
  8: [
    'N', 'NE',
    'E', 'SE',
    'S', 'SW',
    'W', 'NW'
  ],
  16: [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ],
  32: [
    'N', 'NbE', 'NNE', 'NEbN', 'NE', 'NEbE', 'ENE', 'EbN',
    'E', 'EbS', 'ESE', 'SEbE', 'SE', 'SEbS', 'SSE', 'SbE',
    'S', 'SbW', 'SSW', 'SWbS', 'SW', 'SWbW', 'WSW', 'WbS',
    'W', 'WbN', 'WNW', 'NWbW', 'NW', 'NWbN', 'NNW', 'NbW'
  ]
};

function cardinalPoint(degrees, numPoints) {
  numPoints = numPoints || 8;
  var result = '';
  var names = CARDINAL_POINTS[numPoints];
  var slice = 360 / names.length;

  for(var i = 0; i < names.length; i++) {
    var name = names[i];
    var min = (slice * i) - (slice / 2);
    var max = (slice * i) + (slice / 2);

    if ('N' === name && (degrees >= min + 360 || degrees <= max)) {
      result = name;
      break;
    }//end if: special check for North

    if (degrees >= min && degrees <= max) {
      result = name;
      break;
    }//end if: bounds checked
  }//end for: all points checked

  if('' === result) {
    console.error('ERROR: ' + degrees);
    result = '&mdash;'
  }//end if: check for errors
  return result;
}

var app = {
  // options
  prefs: null,
  frequency: 500, // milliseconds
  numPoints: 8,

  // internal
  watch_id: null,
  degrees: null, // degrees off North
  orientation: 'portrait-primary',
  $heading: null,
  $compass: null,
  $direction: null,
  $orientation: null,

  $frequency: null,

  init: function () {
    bindEvents(this, {
      'document': {'deviceready': this.ready},
      'window': {'orientationchange': this.orient},
      'form input': {'change': this.change},
      '#frequency': {'input': this.change}
    });
    return this;
  },

  ready: function () {
    this.$heading = document.querySelector('#heading');
    this.$compass = document.querySelector('#compass');
    this.$direction = document.querySelector('#direction');
    this.$orientation = document.querySelector('#orientation');
    this.$frequency = document.querySelector('#frequency');

    this.prefs = plugins.appPreferences;
    this.prefs.fetch('frequency').then(function (value) {
      this.frequency = value || 500;
      this.$frequency.MaterialSlider.change(this.frequency);
    }.bind(this));

    this.prefs.fetch('numPoints').then(function (value) {
      this.numPoints = value || 8;
      document.querySelector('#numPoints-' + this.numPoints)
              .parentElement.MaterialRadio.check();
    }.bind(this));

    this.orient();
    this.start();
    return this;
  },

  change: function () {
    var freq = parseInt(this.$frequency.value, 10);
    if (freq !== this.frequency) {
      this.frequency = freq;
      this.stop();
      this.start();
    }//end if: watch restarted

    this.numPoints =
      parseInt(document.querySelector('[name="numPoints"]:checked').value, 10);

    this.prefs.store(noop, noop,'frequency', this.frequency);
    this.prefs.store(noop, noop, 'numPoints', this.numPoints);
    return this;
  },

  orient: function () {
    this.orientation = screen.orientation.type;
    return this;
  },

  render: function () {
    var degrees = this.degrees || 0;
    this.$direction.innerHTML = cardinalPoint(this.degrees, this.numPoints);
    this.$heading.innerText = degrees;
    this.$orientation.innerText = this.orientation;
    this.$compass.style.transform =
      'translateY(-50%) translateX(-50%) ' +
      f('rotate', degrees + 'deg');
    return this;
  },

  stop: function () {
    if(!this.watch_id) { return this; }//nothing to do
    navigator.compass.clearWatch(this.watch_id);
    return this;
  },

  update_heading: function (heading) {
    this.degrees = heading.trueHeading || 0;
    switch(this.orientation) {
    case 'portrait-primary':
      break;
    case 'landscape-primary':
      this.degrees += 90;
      break;
    case 'landscape-secondary':
      this.degrees -= 90;
      break;
    case 'portrait-secondary':
      this.degrees += 180;
      break;
    }//end switch: adjustments made

    this.degrees = Math.abs(this.degrees % 360).toFixed(2);
    return this.render();
  },

  start: function () {
    navigator.compass.getCurrentHeading(this.update_heading.bind(this));
    this.watch_id = navigator.compass.watchHeading(
      this.update_heading.bind(this), noop, {frequency: this.frequency}
    );
    return this.render();
  }
};

app.init();
