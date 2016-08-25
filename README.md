# minimal-lightbox
A minimal Medium.com-style lightbox for enlarging media using css transforms, scaling images from their position on a page

## Install

__No Dependencies__


__npm__
```sh
$ npm install minimal-lightbox
```

## Usage

There are two primary ways to consume this library:

1. data-attributes on elements: they must be present when this library is loaded as it attempts to bind to all elements with `[data-action=zoom]`.
2. It also exposes an interface to programmatically bind to elements: 

  ```js
  import minimalLightbox from 'minimal-lightbox';

  // pass any selector/element node to the default import
  minimalLightbox('.some-selector');
  minimalLightbox(someElement);
  ```

### Usage as an external script tag

When including this library as an external script tag (instead of with a module system like browserify or webpack) it exposes a global `minimalLightbox` as the main export. You can use that to programmatically bind elements to be zoomable.

### Styles

This module is dependent on classes/styles to produce the lightbox effect, so your mileage may vary on certain older browsers.

You'll want to include the styles from the `/dist` directory as well.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel='stylesheet' type='text/css' href='../dist/minimal-lightbox.css'>
</head>
<body>
  <img src='http://lorempixel.com/1000/400' data-action='zoom'/>
  
  <!-- include the package -->
  <script type="text/javascript" src="../dist/minimal-lightbox.js"></script>
</body>
</html>
```

## Contribute

Fork and PR any improvements, bug fixes you find. Feel free to open new issues.

To compile new files in `/dist` that include your changes, use this:
```sh
$ npm run build
```
