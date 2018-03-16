import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { arc } from 'd3-shape';
import { format } from 'd3-format';
import { scaleLinear } from 'd3-scale';
import { easeExp, easeElastic } from 'd3-ease';
import Animate from 'react-move/Animate';
import NodeGroup from 'react-move/NodeGroup';
import Text from 'react-svg-text';

class HGraph extends Component {
  static propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      healthyMin: PropTypes.number.isRequired,
      healthyMax: PropTypes.number.isRequired,
      absoluteMin: PropTypes.number.isRequired,
      absoluteMax: PropTypes.number.isRequired,
      unitLabel: PropTypes.string.isRequired,
      children: PropTypes.array
    })).isRequired,
    score: PropTypes.number,
    color: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    margin: PropTypes.shape({
      top: PropTypes.number,
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number
    }),
    thresholdMin: PropTypes.number,
    thresholdMax: PropTypes.number,
    donutHoleFactor: PropTypes.number,
    healthyRangeFillColor: PropTypes.string,
    fontSize: PropTypes.number,
    fontColor: PropTypes.string,
    showAxisLabel: PropTypes.bool,
    axisLabelOffset: PropTypes.number,
    axisLabelWrapWidth: PropTypes.number,
    areaOpacity: PropTypes.number,
    pointRadius: PropTypes.number,
    pointLabelOffset: PropTypes.number,
    pointLabelWrapWidth: PropTypes.number,
    showScore: PropTypes.bool,
    scoreFontSize: PropTypes.number,
    scoreFontColor: PropTypes.string,
    zoomFactor: PropTypes.number,
    zoomTransitionTime: PropTypes.number
  };

  static defaultProps = {
    width: 600,
    height: 600,
    color: '#616363',
    margin: { top: 70, right: 100, bottom: 70, left: 100 },
    thresholdMin: .25,
    thresholdMax: .75,
    donutHoleFactor: .4,
    healthyRangeFillColor: '#98bd8e',
    fontSize: 16,
    fontColor: '#000',
    showAxisLabel: true,
    axisLabelOffset: 12,
    axisLabelWrapWidth: 80,
    areaOpacity: 0.25,
    pointRadius: 10,
    pointLabelOffset: 8,
    pointLabelWrapWidth: null,
    showScore: true,
    scoreFontSize: 120,
    scoreFontColor: '#000',
    zoomFactor: 2.25,
    zoomTransitionTime: 750
  }

  constructor(props) {
    super(props);

    this.absoluteMin = 0;
    this.absoluteMax = 1;

    this.setGlobalConfig(props, false);
    const points = this.assemblePoints(props.data);

    this.state = {
      data: props.data,
      activePointId: '',
      zoomed: false,
      zoomCoords: [0, 0],
      zoomFactor: 1,
      points: points,
      path: this.assemblePath(points),
      suppressTransition: true
    };

    this.Format = format('.0%');
  }

  componentWillReceiveProps(nextProps) {
    // TODO: There may be a way to refine this a bit to occur less often
    if (nextProps !== this.props) {
      this.setGlobalConfig(nextProps);
    }
  }

  setGlobalConfig = (props, shouldSetState = true) => {
    this.radius = Math.min((props.width / 2), (props.height / 2));  // Radius of the outermost circle
    this.rangeBottom = this.radius * this.props.donutHoleFactor;
    this.angleSlice = (Math.PI * 2) / props.data.length;  // The width in radians of each "slice"

    this.scaleRadial = scaleLinear()
      .domain([this.absoluteMin, this.absoluteMax])
      .range([this.rangeBottom, this.radius]);

    if (shouldSetState) {
      const points = this.assemblePoints(props.data);

      this.setState({
        data: props.data,
        points,
        path: this.assemblePath(points)
      });
    }
  }

  convertValueToHgraphPercentage = (valueObject) => {
    const { value, healthyMin, healthyMax, absoluteMin, absoluteMax } = valueObject;
    let scale;

    // Do some error checking
    if (value < absoluteMin || value > absoluteMax) {
      throw "Value is outside permitted absolute range.";
    } else if (absoluteMin > absoluteMax) {
      throw "absoluteMin is higher than absoluteMax."
    } else if (
      healthyMin < absoluteMin ||
      healthyMax < absoluteMin ||
      healthyMax > absoluteMax ||
      healthyMin > absoluteMax) {
      throw "Healthy range extends outside of absolute range."
    }

    if (healthyMin === healthyMax && value === healthyMax) {
      // Possible rare case where only healthy "range" is a single value
      // and the value is healthy
      return this.props.thresholdMax - this.props.thresholdMin;
    }
    else if (value < healthyMin) {
      scale = scaleLinear()
        .domain([absoluteMin, healthyMin])
        .range([this.absoluteMin, this.props.thresholdMin]);
    } else if (value > healthyMax) {
      scale = scaleLinear()
        .domain([healthyMax, absoluteMax])
        .range([this.props.thresholdMax, this.absoluteMax]);
    } else {
      scale = scaleLinear()
        .domain([healthyMin, healthyMax])
        .range([this.props.thresholdMin, this.props.thresholdMax]);
    }
    return scale(value);
  }

  handleSvgClick = (e) => {
    if (this.state.zoomed) {
      this.zoomOut();
    }
  }

  handlePointClick = (d) => (e) => {
    e.stopPropagation();

    const cos = Math.cos(d.angle - Math.PI / 2);
    const sin = Math.sin(d.angle - Math.PI / 2);

    const cx = this.scaleRadial(.5) * cos;
    const cy = this.scaleRadial(.5) * sin;

    if (this.state.zoomed && d.key === this.state.activePointId) {
      this.zoomOut();
    } else {
      if (!this.state.zoomed) {
        this.addChildren();
      }
      this.setState({
        activePointId: d.key,
        zoomed: true,
        zoomCoords: [cx, cy],
        zoomFactor: this.props.zoomFactor
      });
    }
  }

  zoomOut = () => {
    this.removeChildren();
    this.setState({
      activePointId: '',
      zoomed: false,
      zoomCoords: [0, 0],
      zoomFactor: 1
    });
  }

  buildPoint = (d, percentageFromValue) => {
    const heightRange = this.props.height / 6;
    const widthRange = this.props.width * .1;

    const cos = Math.cos(d.angle - Math.PI / 2);
    const sin = Math.sin(d.angle - Math.PI / 2);

    const isAboveMidPoint = percentageFromValue > (this.props.thresholdMax - this.props.thresholdMin);
    const isUnhealthilyHigh = percentageFromValue > this.props.thresholdMax;

    const cx = this.scaleRadial(percentageFromValue) * cos;
    const cy = this.scaleRadial(percentageFromValue) * sin;

    const labelShouldRenderInside = isUnhealthilyHigh || (isAboveMidPoint && cy < heightRange && cy > -heightRange);

    const labelOffset = labelShouldRenderInside ? -this.props.pointLabelOffset : this.props.pointLabelOffset;
    const labelPosition = parseFloat(percentageFromValue);
    const activeCx = (this.scaleRadial(labelPosition) + labelOffset) * cos;
    const activeCy = (this.scaleRadial(labelPosition) + labelOffset) * sin;

    const textAnchor =
      labelShouldRenderInside && cx < widthRange && cx > -widthRange ? 'middle' :
      labelShouldRenderInside && cx < -widthRange ? 'start' :
      labelShouldRenderInside && cx > widthRange ? 'end' :
      cx < -widthRange ? 'end' :
      cx > widthRange ? 'start' :
      'middle';

    const verticalAnchor =
      labelShouldRenderInside && cy < heightRange ? 'start' :
      labelShouldRenderInside && cy > heightRange ? 'end' :
      labelShouldRenderInside ? 'middle' :
      cy < heightRange ? 'end' :
      cy > heightRange ? 'start' :
      'middle';

      return {
        key: d.id,
        value: d.value,
        angle: d.angle,
        cx: d.cx || cx,
        cy: d.cy || cy,
        activeCx,
        activeCy,
        color: this.thresholdColor(percentageFromValue, this.props.color),
        fontColor: this.thresholdColor(percentageFromValue, this.props.fontColor),
        unitLabel: d.unitLabel,
        textAnchor,
        verticalAnchor,
        isChild: d.isChild || false,
        children: d.children || null
      };
  }

  assemblePath = (points) => {
    let fillString = '';

    points.map((p, i) => {
      fillString += (i === 0 ? 'M ' : 'L ') + p.cx + ' ' + p.cy + ' ';
    });

    return fillString;
  }

  assemblePoints = (data, addingChildren = false) => {
    const points = data.map((d, i) => {
      const percentageFromValue = this.convertValueToHgraphPercentage(d);
      d.angle = addingChildren && d.angle ? d.angle : this.angleSlice * i;

      return this.buildPoint(d, percentageFromValue);
    });

    return [].concat.apply([], points);
  }

  addChildren = () => {
    let finalData = this.state.data.map(d => d);
    let intrimData = this.state.data.map(d => d);
    let groupsInserted = 0;

    const allDataWithChildren = this.state.data.filter(d => d.children && d.children.length);

    allDataWithChildren.forEach(data => {
      const dataIndex = this.state.data.findIndex(d => d.id === data.id);
      const point = this.state.points[dataIndex];
      const siblingPoint = this.state.points[dataIndex + 1];

      const vector = [(siblingPoint.cx - point.cx), (siblingPoint.cy - point.cy)];
      const distance = Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
      const vectorNormalized = [vector[0] / distance, vector[1] / distance];
      const angleSections = point.children.length + 1;

      const pointsIntrimChildren = point.children.map((c, i) => {
        const copy = Object.assign({}, c);
        const frac = 1 / (angleSections);
        copy.cx = point.cx + (distance * (frac * (i + 1))) * vectorNormalized[0];
        copy.cy = point.cy + (distance * (frac * (i + 1))) * vectorNormalized[1];
        copy.isChild = true;
        copy.angle = (this.angleSlice * dataIndex) + ((this.angleSlice / angleSections) * (i + 1));
        return copy;
      });

      point.children.map((c, i) => {
        c.angle = (this.angleSlice * dataIndex) + ((this.angleSlice / angleSections) * (i + 1));
        c.isChild = true;
        return c;
      });

      const spliceIndex = dataIndex + 1 + groupsInserted;

      intrimData.splice(spliceIndex, 0, pointsIntrimChildren);
      finalData.splice(spliceIndex, 0, point.children);

      groupsInserted += 1;
    });

    intrimData = [].concat.apply([], intrimData);
    finalData = [].concat.apply([], finalData);

    const intrimPoints = this.assemblePoints(intrimData, true);
    const intrimPath = this.assemblePath(intrimPoints);
    const finalPoints = this.assemblePoints(finalData, true);

    this.setState({
      data: intrimData,
      points: intrimPoints,
      path: intrimPath,
      returnIntrimData: intrimData,
      returnIntrimPoints: intrimPoints,
      returnIntrimPath: intrimPath,
      suppressTransition: true
    }, () => {
      this.setState({
        data: finalData,
        points: finalPoints,
        path: this.assemblePath(finalPoints),
        suppressTransition: false
      });
    });
  }

  removeChildren = () => {
    const finalData = this.state.data.filter(d => !d.isChild);
    const finalPoints = this.assemblePoints(finalData);
    const finalPath = this.assemblePath(finalPoints);

    if (this.state.returnIntrimData) {
      this.setState({
        data: this.state.returnIntrimData,
        points: this.state.returnIntrimPoints,
        path: this.state.returnIntrimPath,
        suppressTransition: false,
      }, () => {
        setTimeout(() => {
          this.setState({
            data: finalData,
            points: finalPoints,
            path: finalPath,
            returnIntrimData: null,
            returnIntrimPoints: null,
            returnIntrimPath: null,
            suppressTransition: true
          });
        }, this.props.zoomTransitionTime + 50);
      });
    } else {
      this.setState({
        data: finalData,
        points: finalPoints,
        path: finalPath,
        suppressTransition: true
      });
    }
  }

  thresholdColor = (value, color) => {
    return (value < this.props.thresholdMin || value > this.props.thresholdMax) ? '#df6053' : color;
  }

  renderThreshold = () => {
    const tau = 2 * Math.PI;
    const healthyArc = arc()
      .outerRadius(this.scaleRadial(this.props.thresholdMax))
      .innerRadius(this.scaleRadial(this.props.thresholdMin))
      .startAngle(0)
      .endAngle(tau);
    // NOTE: totalArc just here for dev purposes for now
    const totalArc = arc()
      .outerRadius(this.scaleRadial(0))
      .innerRadius(this.scaleRadial(1))
      .startAngle(0)
      .endAngle(tau);
    return (
      <g>
        { /* NOTE: totalArc just here for dev purposes for now */ }
        <path
          d={ totalArc() }
          fill={'#000' }
          fillOpacity=".05">
        </path>
        <path
          d={ healthyArc() }
          fill={ this.props.healthyRangeFillColor }
          fillOpacity="1">
        </path>
      </g>
    )
  }

  renderAxisLabels = (fontSize) => {
    return (
      <g>
        {this.state.data.map((d, i) => {
          const x = (this.scaleRadial(this.absoluteMax) + this.props.axisLabelOffset) * Math.cos(d.angle - Math.PI / 2);
          const y = (this.scaleRadial(this.absoluteMax) + this.props.axisLabelOffset) * Math.sin(d.angle - Math.PI / 2);

          return (
            <g key={ d.id }>
              <Text
                x={ x }
                y={ y }
                fontSize={ fontSize }
                verticalAnchor={ y > 100 ? "start" : y < 100 ? "end" : "middle" }
                textAnchor={ x > 10 ? "start" : x < -10 ? "end" : "middle" }
                width={ this.props.axisLabelWrapWidth }
                fill={ this.props.fontColor }>
                { d.label }
              </Text>
            </g>
          )
        })}
      </g>
    )
  }

  renderAxes = (fontSize) => {
    return (
      <g>
        { this.renderThreshold() }
        { this.props.showAxisLabel ? this.renderAxisLabels(fontSize) : null }
      </g>
    )
  }

  render() {
    return(
      <div>
          <svg
            width={ this.props.width + this.props.margin.left + this.props.margin.right }
            height={ this.props.height + this.props.margin.top + this.props.margin.bottom }
            onClick={ this.handleSvgClick }>
            <g
              transform={ "translate(" + ((this.props.width / 2) + this.props.margin.left) + "," + ((this.props.height / 2) + this.props.margin.top) + ")" }>
              <Animate
                start={{
                  path: this.state.path,
                  zoomFactor: this.state.zoomFactor,
                  zoomCoords: this.state.zoomCoords,
                  fontSize: this.props.fontSize / this.state.zoomFactor,
                  pointRadius: this.props.pointRadius / this.state.zoomFactor
                }}
                enter={{
                  path: this.state.path,
                  zoomFactor: this.state.zoomFactor,
                  zoomCoords: this.state.zoomCoords,
                  fontSize: this.props.fontSize / this.state.zoomFactor,
                  pointRadius: this.props.pointRadius / this.state.zoomFactor
                }}
                update={[
                  {
                    d: this.state.suppressTransition ? this.state.path : [this.state.path],
                    timing: { duration: this.props.zoomTransitionTime, ease: easeElastic, delay: this.state.zoomed ? this.props.zoomTransitionTime : 0 }
                  },
                  {
                    zoomFactor: [this.state.zoomFactor],
                    zoomCoords: [this.state.zoomCoords],
                    fontSize: [this.props.fontSize / this.state.zoomFactor],
                    pointRadius: [this.props.pointRadius / this.state.zoomFactor],
                    timing: { duration: this.props.zoomTransitionTime, ease: easeExp, delay: this.state.zoomed ? 0 : this.props.zoomTransitionTime }
                  }
                ]}>
                {(globalState) => {
                  return (
                    <g
                      transform={ `scale(${ globalState.zoomFactor }) translate(${ -globalState.zoomCoords[0] || 0 }, ${ -globalState.zoomCoords[1] || 0 })` }>
                      <g className="axis-container">
                        { this.renderAxes(globalState.fontSize) }
                      </g>
                      <path
                        d={ globalState.d }
                        fill={ this.props.color }
                        opacity={ this.props.areaOpacity }
                      />
                      <NodeGroup
                        data={ this.state.points }
                        keyAccessor={ (d) => d.key }
                        start={(d, index) => {
                          return {
                            cx: d.cx,
                            cy: d.cy,
                            textOpacity: 0,
                            r: d.isChild ? 0 : this.props.pointRadius / this.state.zoomFactor,
                            opacity: d.isChild ? 0 : 1
                          }
                        }}
                        enter={(d, index) => {
                          return {
                            cx: d.cx,
                            cy: d.cy,
                            textOpacity: 0,
                            r: d.isChild ? 0 : this.props.pointRadius / this.state.zoomFactor,
                            opacity: d.isChild ? 0 : 1
                          }
                        }}
                        update={(d, index) => {
                          const { zoomed } = this.state;
                          const radius = this.props.pointRadius / this.state.zoomFactor;
                          return [
                            {
                              cx: this.state.suppressTransition ? d.cx : [d.cx],
                              cy: this.state.suppressTransition ? d.cy : [d.cy],
                              r: !zoomed && d.isChild ? [1] : d.isChild ? [radius * .75] : [radius],
                              opacity: !zoomed && d.isChild ? [0] : [1],
                              timing: {
                                duration: this.props.zoomTransitionTime,
                                ease: d.isChild ? easeElastic : easeExp,
                                delay:
                                  (zoomed && !d.isChild) ? 0 :
                                  (zoomed && d.isChild) ? this.props.zoomTransitionTime :
                                  (!zoomed && !d.isChild) ? this.props.zoomTransitionTime :
                                  (!zoomed && d.isChild) ? 0 : 0
                              }
                            },
                            {
                              textOpacity: this.state.zoomed ? [1] : 0,
                              timing: {
                                duration: this.props.zoomTransitionTime,
                                ease: easeExp,
                                delay:
                                  (zoomed && !d.isChild) ? 0 :
                                  (zoomed && d.isChild) ? this.props.zoomTransitionTime :
                                  (!zoomed && !d.isChild) ? this.props.zoomTransitionTime :
                                  (!zoomed && d.isChild) ? 0 : 0
                              }
                            }
                          ]
                        }}
                      >
                        {(nodes) => {
                          return (
                            <g>
                              {nodes.map(({ key, data, state }) => {
                                return (
                                  <g key={ data.key }>
                                    <circle
                                      className="polygon__point"
                                      r={ state.r }
                                      fill={ data.color }
                                      cx={ state.cx }
                                      cy={ state.cy }
                                      opacity={ state.opacity }
                                      onClick={ this.handlePointClick(data) }>
                                    </circle>
                                    <Text
                                      opacity={ state.textOpacity }
                                      width={ this.props.pointLabelWrapWidth }
                                      x={ data.activeCx }
                                      y={ data.activeCy }
                                      fontSize={ globalState.fontSize }
                                      verticalAnchor={ data.verticalAnchor }
                                      textAnchor={ data.textAnchor }
                                      fill={ data.fontColor }
                                      style={{ pointerEvents: 'none' }}>
                                      { `${data.value} ${data.unitLabel}` }
                                    </Text>
                                  </g>
                                )
                              })}
                            </g>
                          );
                        }}
                      </NodeGroup>
                      <Text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        verticalAnchor="middle"
                        fontSize={ this.props.scoreFontSize }
                        fontWeight="bold"
                        pointerEvents="none"
                        fill={ this.props.scoreFontColor }>
                          { this.props.score }
                      </Text>
                    </g>
                  )
                }}
              </Animate>
            </g>
          </svg>
      </div>
    )
  }
}

export default HGraph;
