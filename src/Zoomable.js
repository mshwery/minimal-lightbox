'use strict';

const PREFIXES = [
  'webkit',
  'moz',
  'MS',
  'o',
  ''
];

function prefixedEvent(element, type, callback) {
  for (let prefix of PREFIXES) {
    if (!prefix) {
      type = type.toLowerCase();
    }

    element.addEventListener(prefix + type, callback, false);
  }
}

const defaults = {
  attachTo: 'body',
  ignoreScroll: false
};

class Zoomable {
  constructor(element) {
    this.element = element;
    this.config = Object.assign({}, defaults, { element: element });

    // bind element to do things when the image has loaded
    element.onload = onImageLoad;

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
      let translate = getTranslate(element);
      let scale = getZoom(element);
      let overlay = document.createElement('div');

      // prepare overlay element
      overlay.classList.add('zoom-overlay', 'fade-in');

      element.style.transform = `${translate} scale(${scale})`;
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

function getActualImageSize(element) {
  let dimensions = new Promise(function(resolve, reject) {  

    // Make in memory copy of image to avoid css issues
    let image = element.cloneNode(true);

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
  let height = element.offsetHeight;
  let width = element.offsetWidth;
  let ratio = height / width * 100;
  
  getActualImageSize(element).then(function(dimensions) {
    // insert filler before element
    element.insertAdjacentHTML('beforebegin', `<div class="media-fill" style="padding-top: ${ratio}%;"></div>`);
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
  var rect = node.getBoundingClientRect()

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
  
  return Math.min(scaleY,scaleX);
}

function getTranslate(element) {
  var viewport = getViewportDimensions();
  
  // image width and height
  var imageWidth = element.offsetWidth;
  var imageHeight = element.offsetHeight;

  // compute distance from image center to viewport center
  var imageCenterScrolltop =  offset(element).top + (imageHeight / 2) - window.scrollY;
  var translateY = (viewport.height / 2) - imageCenterScrolltop;
  
  var imageCenterWidth = offset(element).left + (imageWidth / 2);
  var translateX = (viewport.width / 2) - imageCenterWidth;
  
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
