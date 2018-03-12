# hGraph React
An open source visualization for patient health data, as a React component using d3.

## This project is still in development. Look for production-ready v1.0.0 in early spring 2018.

## Installation
This package can be [found on npm](https://www.npmjs.com/package/hgraph-react) and installed like so:
```bash
$ yarn add hgraph-react
# or
$ npm install hgraph-react
```
The hGraph component is packaged using [webpack](https://webpack.js.org/).

## Usage

[//]: # (
Still to document or check if relevant/correct:
  absoluteMin: PropTypes.number,
  absoluteMax: PropTypes.number,
  thresholdMin: PropTypes.number,
  thresholdMax: PropTypes.number,
  axisLabelOffset: PropTypes.number,
  areaOpacityActive: PropTypes.number,
  pointLabelOffset: PropTypes.number,
)

[//]: # (TODO: How to provide documentation for data elements shape)
### hGraph Component Props
Most props are not required and have sensible defaults built in, as listed below.

| Prop Name | Type | Is Required | Description | Default |
| --------- | ---- | ----------- | ----------- | ------- |
| data | array | true | An array of objects representing the metrics to display in hGraph (see [below](#metrics)) | N/A |
| score | number | false | The overall score to display in the center of hGraph | N/A |
| width | number | false | The width in pixels hGraph should render at. | 600 |
| height | number | false | The height in pixels hGraph should render at. | 600 |
| margin | object | false | An object representing the values for margins around hGraph. | `{ top: 70, right: 100, bottom: 70, left: 100 }` |
| color | string (hex color code) | false | The color of the points and polygon shape. | '#616363' |
| healthyRangeFillColor | string (hex color code) | false | The color of the healthy range band. | '#98bd8e' |
| fontSize | number | false | The size (in pixels) of the font for the labels. | 16 |
| fontColor | string (hex color code) | false | The color of the labels. | '#000' |
| showAxisLabel | boolean | false | Whether or not axis labels should display around hGraph. | true |
| axisLabelWrapWidth | number | false | The width (in pixels) that the labels should wrap text at. | 80 (Note: use `null` for no wrapping) |
| areaOpacity | number | false | The opacity of the polygon shape. | 0.25 |
| pointRadius | number | false | The radius (in pixels) of the points for metric values. | 10 |
| pointLabelWrapWidth | number | The width (in pixels) that the point levels should wrap text at. | null (no wrapping) |
| showScore | boolean | false | Whether or not to display the overall score in the middle of hGraph. | true |
| scoreFontSize | number | false | The size (in pixels) of the font for the overall hGraph score | 120 |
| scoreFontColor | string (hex color code) | false | The color of the hGraph score. | '#000' |
| zoomFactor | number | false | The multiplier factor hGraph should zoom in. | 2.25 |
| zoomTransitionTime | number | false | The amount of time (in milliseconds) the zooming animation should take. | 750 |


### hGraph Metric Object Properties <a name="metrics"></a>
[//]: # (TODO: Is id really required? Right now labels need to be unique but should probably change this, use id instead?)

| Property Name | Type | Is Required | Description |
| ------------- | ---- | ----------- | ----------- |
| id | string | true | A unique (compared to all other metrics) identifier string for the metric. |
| label | string | true | The axis display label for the metric. |
| value | number | true | The patient's recorded value for the metric. |
| healthyMin | number | true | The minimum value possible to still be considered a healthy value. |
| healthyMax | number | true | The maximum value possible to still be considered a healthy value. |
| absoluteMin | number | true | A reasonable minimum possible value for this metric. Note: values below this absolute minimum will be clamped to the min.) |
| absoluteMax | number | true | A reasonable maximum possible value for this metric. Note: values above this absolute maximum will be clamped to the max. |
| unitLabel | string | true | The units the metric is measured in, displayed with the metric value. |
| children | array | false | Optional array of child metrics that comprise this metric. Children metrics should conform to hGraph Metric Objects properties. Children are shown when a point is clicked and hGraph is in the "zoomed in" state. |
