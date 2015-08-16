(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.Zoomable = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var PREFIXES = ['webkit', 'moz', 'MS', 'o', ''];

  function prefixedEvent(element, type, callback) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = PREFIXES[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var prefix = _step.value;

        if (!prefix) {
          type = type.toLowerCase();
        }

        element.addEventListener(prefix + type, callback, false);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }

  var defaults = {
    attachTo: 'body',
    ignoreScroll: false
  };

  var Zoomable = (function () {
    function Zoomable(element) {
      _classCallCheck(this, Zoomable);

      this.element = element;
      this.config = _extends({}, defaults, { element: element });

      // bind element to do things when the image has loaded
      element.onload = onImageLoad;

      // bind click to toggle zoom
      element.addEventListener('click', this.toggleZoom.bind(this), false);

      prefixedEvent(element, 'TransitionEnd', this.removeZoomClass.bind(this));

      // wrap with container
      this.wrap();
    }

    // create a one-time event

    _createClass(Zoomable, [{
      key: 'wrap',
      value: function wrap() {
        var wrapper = document.createElement('div');
        wrapper.className = 'media-placeholder';

        var parent = this.element.parentNode;
        var sibling = this.element.nextElementSibling;

        wrapper.appendChild(this.element);

        if (sibling) {
          parent.insertBefore(wrapper, sibling);
        } else {
          parent.appendChild(wrapper);
        }
      }
    }, {
      key: 'toggleZoom',
      value: function toggleZoom(zoomOut) {
        var element = this.element;
        var isZoomed = typeof zoomOut === 'boolean' ? zoomOut : element.classList.contains('zoomed');
        var scrollFn = this.onScroll.bind(this);

        // clear all other elements caught in transition (not sure how this happens)
        var siblings = document.querySelectorAll('.zooming');

        for (var i = 0; i < siblings.length; i++) {
          siblings[i].classList.remove('zooming');
        }

        if (isZoomed) {
          element.style.transform = '';
          element.classList.add('zooming-out');
          element.classList.remove('zoomed');

          // remove the next sibling (the overlay)
          if (element.nextElementSibling) {
            element.nextElementSibling.remove();
          }

          // remove scroll listener on this element
          if (!this.config.ignoreScroll) {
            document.removeEventListener('scroll', scrollFn);
          }
        } else {
          var translate = getTranslate(element);
          var scale = getZoom(element);
          var overlay = document.createElement('div');

          // prepare overlay element
          overlay.classList.add('zoom-overlay', 'fade-in');

          element.style.transform = translate + ' scale(' + scale + ')';
          element.classList.add('zoomed', 'zooming-in');
          this._ignoreScroll = false;

          // insert the overlay after this element
          element.parentNode.insertBefore(overlay, element.nextElementSibling);

          // bind click on overlay
          once(overlay, 'click', this.toggleZoom.bind(this));

          // listen for scroll, bound to this element
          if (!this.config.ignoreScroll) {
            document.addEventListener('scroll', scrollFn);
          }
        }

        element.classList.add('zooming');
      }
    }, {
      key: 'onScroll',
      value: function onScroll() {
        if (!this._ignoreScroll) {
          this._ignoreScroll = true;
          this.toggleZoom.call(this, true);
        }
      }
    }, {
      key: 'removeZoomClass',
      value: function removeZoomClass() {
        this.element.classList.remove('zooming', 'zooming-in', 'zooming-out');
      }
    }]);

    return Zoomable;
  })();

  function once(node, type, callback) {
    // create event
    node.addEventListener(type, function (e) {
      // remove event
      e.target.removeEventListener(e.type, node);
      // call handler
      return callback(e);
    });
  }

  function getActualImageSize(element) {
    var dimensions = new Promise(function (resolve, reject) {

      // Make in memory copy of image to avoid css issues
      var image = element.cloneNode(true);

      image.onload = function () {
        resolve({
          width: this.width,
          height: this.height
        });
      };
    });

    return dimensions;
  }

  function onImageLoad() {
    var element = this;
    var height = element.offsetHeight;
    var width = element.offsetWidth;
    var ratio = height / width * 100;

    getActualImageSize(element).then(function (dimensions) {
      // insert filler before element
      element.insertAdjacentHTML('beforebegin', '<div class="media-fill" style="padding-top: ' + ratio + '%;"></div>');
      element.classList.add('media-image');
      element.setAttribute('data-width', dimensions.width);
      element.setAttribute('data-height', dimensions.height);
    });
  }

  function getViewportDimensions() {
    // viewport width and height
    var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    return {
      width: viewportWidth,
      height: viewportHeight
    };
  }

  function offset(node) {
    var rect = node.getBoundingClientRect();

    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft
    };
  }

  function getZoom(element) {
    var scale = 1;

    // margin between full viewport and full image
    var margin = 20;
    var totalOffset = margin * 2;
    var viewport = getViewportDimensions();

    var scaleX = viewport.width / (element.offsetWidth + totalOffset);
    var scaleY = viewport.height / (element.offsetHeight + totalOffset);

    return Math.min(scaleY, scaleX);
  }

  function getTranslate(element) {
    var viewport = getViewportDimensions();

    // image width and height
    var imageWidth = element.offsetWidth;
    var imageHeight = element.offsetHeight;

    // compute distance from image center to viewport center
    var imageCenterScrolltop = offset(element).top + imageHeight / 2 - window.scrollY;
    var translateY = viewport.height / 2 - imageCenterScrolltop;

    var imageCenterWidth = offset(element).left + imageWidth / 2;
    var translateX = viewport.width / 2 - imageCenterWidth;

    return 'translate(' + translateX + 'px, ' + translateY + 'px) translateZ(0px)';
  }

  /**
   * bind to all elements with `data-action=zoom`
   */
  document.addEventListener('DOMContentLoaded', function () {
    var elements = document.querySelectorAll('[data-action=zoom]');

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      element.__zoomable__ = new Zoomable(element);
    }
  });
});
