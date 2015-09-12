/* global Promise */
'use strict';

const PREFIXES = [
  'webkit',
  'moz',
  'MS',
  'o',
  ''
];

const ANIMATION_PREFIXES = {
  'animation':'animationend',
  'OAnimation':'oanimationend',
  'MSAnimation':'MSAnimationEnd',
  'WebkitAnimation':'webkitAnimationEnd'
};

function prefixedEvent(element, type, callback) {
  for (let prefix of PREFIXES) {
    if (!prefix) {
      type = type.toLowerCase();
    }

    element.addEventListener(prefix + type, callback, false);
  }
}

function addPrefixedStyle(element, property, style) {
  for (let prefix of PREFIXES) {
    if (!prefix) {
      property = property.toLowerCase();
    }

    element.style[prefix + property] = style;
  }
}

// Determine the prefix for the animation events
// @see: http://davidwalsh.name/css-animation-callback
function whichAnimationEvent() {
  let el = document.createElement('fakeelement');

  for (let animationPrefix in ANIMATION_PREFIXES) {
    if (el.style[animationPrefix] !== undefined) {
      return ANIMATION_PREFIXES[animationPrefix];
    }
  }
}

const animationEndPrefixed = whichAnimationEvent();

const defaults = {
  attachTo: 'body',
  ignoreScroll: false
};

class Zoomable {
  constructor(element) {
    this.element = element;
    this.config = Object.assign({}, defaults, { element: element });

    // bind element to do things when the image has loaded
    onImageLoad.call(element);

    // bind click to toggle zoom
    element.addEventListener('click', this.toggleZoom.bind(this), false);

    prefixedEvent(element, 'TransitionEnd', this.removeZoomClass.bind(this));

    // wrap with container
    this.wrap();
  }

  wrap() {
    let wrapper = document.createElement('div');
    wrapper.className = 'media-placeholder';

    let parent = this.element.parentNode;
    let sibling = this.element.nextElementSibling;

    wrapper.appendChild(this.element);

    if (sibling) {
      parent.insertBefore(wrapper, sibling);
    } else {
      parent.appendChild(wrapper);
    }
  }

  toggleZoom(zoomOut) {
    let element = this.element;
    let isZoomed = typeof zoomOut === 'boolean' ? zoomOut : element.classList.contains('zoomed');
    let scrollFn = this.onScroll.bind(this);

    // clear all other elements caught in transition (not sure how this happens)
    let siblings = document.querySelectorAll('.zooming');

    for (let i = 0; i < siblings.length; i++) {
       siblings[i].classList.remove('zooming');
    }

    if (isZoomed) {
      addPrefixedStyle(element, 'Transform', '');
      element.classList.add('zooming-out');
      element.classList.remove('zoomed');

      // remove the next sibling (the overlay)
      if (element.nextElementSibling) {
        let overlay = element.nextElementSibling;

        overlay.classList.add('fade-out');
        overlay.addEventListener(animationEndPrefixed, () => {
          if(overlay.parentNode) {
            overlay.parentNode.removeChild(overlay); // element.remove() is not supported on ie
          }
        });
      }

      // remove scroll listener on this element
      if (!this.config.ignoreScroll) {
        document.removeEventListener('scroll', scrollFn);
      }
    } else {
      let translate = getTranslate(element);
      let scale = getZoom(element);
      let overlay = document.createElement('div');

      // prepare overlay element
      overlay.classList.add('zoom-overlay', 'fade-in');

      addPrefixedStyle(element, 'Transform', `${translate} scale(${scale})`);
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

  onScroll() {
    if (!this._ignoreScroll) {
      this._ignoreScroll = true;
      this.toggleZoom.call(this, true);
    }
  }

  removeZoomClass() {
    this.element.classList.remove('zooming', 'zooming-in', 'zooming-out');
  }
}

// create a one-time event
function once(node, type, callback) {
  // create event
  node.addEventListener(type, function(e) {
    // remove event
    e.target.removeEventListener(e.type, node);
    // call handler
    return callback(e);
  });
}

function getActualImageSize(src) {
  let dimensions = new Promise(function(resolve, reject) {

    // Make in memory copy of image to avoid css issues
    // let image = element.cloneNode(true);
    let image = new Image();
    image.src = src;

    image.onload = function() {
      resolve({
        width: this.width,
        height: this.height
      });
    };
  });

  return dimensions;
}

function onImageLoad() {
  let element = this;
  let src = element.src;

  if (!src && element.style.backgroundImage) {
    // finds the first background image matching the url pattern
    src = element.style.backgroundImage.replace(/.*\s?url\([\'\"]?/, '').replace(/[\'\"]?\).*/, '');
  }

  if (src) {
    getActualImageSize(src).then(createFillerElement.bind(element));
  }
}

/**
 * insert filler element before element
 */
function createFillerElement(dimensions) {
  let element = this;
  let height = element.offsetHeight;
  let width = element.offsetWidth;
  let ratio = Math.round(height / width * 100);
  // let actualRatio = Math.round(dimensions.height / dimensions.width * 100);

  // if (ratio !== actualRatio) {
    element.setAttribute('data-width', width);
    element.setAttribute('data-height', height);
    element.setAttribute('data-actual-width', dimensions.width);
    element.setAttribute('data-actual-height', dimensions.height);
  // }

  element.insertAdjacentHTML('beforebegin', `<div class="media-fill" style="padding-top: ${ratio}%;"></div>`);
  element.classList.add('media-image');
}

function getViewportDimensions() {
  // viewport width and height
  let viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  let viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

  return {
    width: viewportWidth,
    height: viewportHeight
  };
}

function offset(node) {
  let rect = node.getBoundingClientRect()

  return {
    top: rect.top + document.body.scrollTop,
    left: rect.left + document.body.scrollLeft
  };
}

function getZoom(element) {
  let scale = 1;

  // margin between full viewport and full image
  let margin = 20;
  let totalOffset = margin * 2;
  let viewport = getViewportDimensions();

  let scaleX = viewport.width / (getWidth(element) + totalOffset);
  let scaleY = viewport.height / (getHeight(element) + totalOffset);

  return Math.min(scaleY,scaleX);
}

function getWidth(element) {
  return element.offsetWidth;
  // @todo grow to actual width/height ratio
  // let width = element.offsetWidth;

  // if (element.dataset.width && element.dataset.height) {
  //   width = Number(element.dataset.width / element.dataset.height * getHeight(element));
  // }

  // return width;
}

function getHeight(element) {
  return element.offsetHeight;
}

function getTranslate(element) {
  let viewport = getViewportDimensions();

  /**
   * get the actual image width and height
   */
  let imageWidth = getWidth(element);
  let imageHeight = getHeight(element);

  // compute distance from image center to viewport center
  let imageCenterScrolltop =  offset(element).top + (imageHeight / 2) - window.scrollY;
  let translateY = (viewport.height / 2) - imageCenterScrolltop;

  let imageCenterWidth = offset(element).left + (imageWidth / 2);
  let translateX = (viewport.width / 2) - imageCenterWidth;

  return `translate(${translateX}px, ${translateY}px) translateZ(0px)`;
}

/**
 * bind to all elements with `data-action=zoom`
 */
document.addEventListener('DOMContentLoaded', () => {
  let elements = document.querySelectorAll('[data-action=zoom]');

  for (let i = 0; i < elements.length; i++) {
    let element = elements[i];
    element.__zoomable__ = new Zoomable(element);
  }
});
