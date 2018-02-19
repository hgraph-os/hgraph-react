import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { arc } from 'd3-shape';
import { format } from 'd3-format';
import { scaleLinear } from 'd3-scale';
import Text from 'react-svg-text';

import Polygon from './components/polygon';

class HGraph extends Component {
  static propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      values: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
        healthyMin: PropTypes.number.isRequired,
        healthyMax: PropTypes.number.isRequired,
        absoluteMin: PropTypes.number.isRequired,
        absoluteMax: PropTypes.number.isRequired,
        unit: PropTypes.string.isRequired
      })),
      score: PropTypes.number.isRequired,
      color: PropTypes.string
    })),
    width: PropTypes.number,
    height: PropTypes.number,
    margin: PropTypes.shape({
      top: PropTypes.number,
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number
    }),
    absoluteMin: PropTypes.number,
    absoluteMax: PropTypes.number,
    thresholdMin: PropTypes.number,
    thresholdMax: PropTypes.number,
    axisLabel: PropTypes.bool,
    axisLabelOffset: PropTypes.number,
    axisLabelWrapWidth: PropTypes.number,
    highlight: PropTypes.bool,
    highlightStrokeColor: PropTypes.string,
    areaOpacity: PropTypes.number,
    areaOpacityActive: PropTypes.number,
    pointRadius: PropTypes.number,
    textColor: PropTypes.string,
    activePointOffset: PropTypes.number,
    scoreEnabled: PropTypes.bool,
  };

  static defaultProps = {
    width: 600,
    height: 600,
    margin: { top: 70, right: 100, bottom: 70, left: 100 },
    absoluteMin: 0,
    absoluteMax: 1,
    thresholdMin: .25,
    thresholdMax: .75,
    axisLabel: true,
    axisLabelOffset: 1.1,
    axisLabelWrapWidth: 80,
    highlight: false,
    highlightStrokeColor: '#8F85FF',
    areaOpacity: 0.25,
    areaOpacityActive: 0.6,
    pointRadius: 10,
    activePointOffset: 0.1,
    textColor: '#000',
    textSize: '16px',
    scoreEnabled: true,
  }

  constructor(props) {
    super(props);

    this.state = {
      data: props.data || [],
      activeNodeId: ''
    };

    this.Format = format('.0%');
    this.defaultColor = '#616363';

    if (props.data) {
      this.initConfig(props);
    }
  }

  componentWillReceiveProps(nextProps) {
    // TODO: There may be a way to refine this a bit to occur less often
    if (nextProps !== this.props) {
      this.initConfig(nextProps);
      this.setState({ data: nextProps.data });
    }
  }

  initConfig = (props) => {
    if (props.data.length) {
      // NOTE: data[0] means currently this code assumes all entries have the same axis data
      this.allAxis = props.data[0].values.map(val => val.label);  // Names of each axis
    } else {
      this.allAxis = this.allAxis ? this.allAxis : []; // A.k.a. If it has been set before, then leave it. If not, use empty array as placeholder.
    }

    this.absoluteMin = props.absoluteMin;
    this.absoluteMax = props.absoluteMax;

    this.radius = Math.min((props.width / 2), (props.height / 2));  // Radius of the outermost circle
    this.rangeBottom = this.radius / 2.5;
    this.angleSlice = (Math.PI * 2) / this.allAxis.length;  // The width in radians of each "slice"

    this.scaleRadial = scaleLinear()
      .domain([this.absoluteMin, this.absoluteMax])
      .range([this.rangeBottom, this.radius]);
  }

  convertValueToHgraphPercentage = (valueObject) => {
    const { value, healthyMin, healthyMax, absoluteMin, absoluteMax } = valueObject;
    let scale;

    if (value < healthyMin) {
      scale = scaleLinear()
        .domain([absoluteMin, healthyMin])
        .range([this.props.absoluteMin, this.props.thresholdMin]);
    } else if (value > healthyMax) {
      scale = scaleLinear()
        .domain([healthyMax, absoluteMax])
        .range([this.props.thresholdMax, this.props.absoluteMax]);
    } else {
      scale = scaleLinear()
        .domain([healthyMin, healthyMax])
        .range([this.props.thresholdMin, this.props.thresholdMax]);
    }
    return scale(value);
  }

  handlePolygonClick = (data) => () => {
    if (data.id === this.state.activeNodeId) {
      this.setState({ activeNodeId: '' });
    } else {
      this.setState({ activeNodeId: data.id });
    }
  }

  assemblePointsData = (data) => {
    const heightRange = this.props.height / 6;
    const widthRange = this.props.width * .1;

    return data.values.map((val, i) => {
      // TODO: Ugh, clean this up at some point
      const cos = Math.cos(this.angleSlice * i - Math.PI / 2);
      const sin = Math.sin(this.angleSlice * i - Math.PI / 2);

      const percentageFromValue = this.convertValueToHgraphPercentage(val);
      const isAboveMidPoint = percentageFromValue > (this.props.thresholdMax - this.props.thresholdMin);
      const isUnhealthilyHigh = percentageFromValue > this.props.thresholdMax;

      const cx = this.scaleRadial(percentageFromValue) * cos;
      const cy = this.scaleRadial(percentageFromValue) * sin;

      const labelShouldRenderInside = isUnhealthilyHigh || (isAboveMidPoint && cy < heightRange && cy > -heightRange);

      const activeOffset = labelShouldRenderInside ? -this.props.activePointOffset : this.props.activePointOffset;
      const activeVal = parseFloat(percentageFromValue) + activeOffset;
      const activeCx = this.scaleRadial(activeVal) * cos;
      const activeCy = this.scaleRadial(activeVal) * sin;

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
        key: val.label.replace(/\s/g,''),
        value: val.value,
        cx,
        cy,
        activeCx,
        activeCy,
        color: this.thresholdColor(percentageFromValue, data.color),
        textColor: this.thresholdColor(percentageFromValue, this.props.textColor),
        unit: val.unit,
        textAnchor,
        verticalAnchor
      };
    });
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
        {/* <path
          d={ totalArc() }
          fill={'#000' }
          fillOpacity=".05">
        </path> */}
        <path
          d={ healthyArc() }
          fill={ this.props.highlight ? this.props.highlightStrokeColor : '#98bd8e' }
          fillOpacity="1">
        </path>
      </g>
    )
  }

  renderAxisLabels = () => {
    return (
      <g>
        {this.allAxis.map((axis, i) => {
          const x = this.scaleRadial(this.absoluteMax * this.props.axisLabelOffset) * Math.cos(this.angleSlice * i - Math.PI / 2);
          const y = this.scaleRadial(this.absoluteMax * this.props.axisLabelOffset) * Math.sin(this.angleSlice * i - Math.PI / 2);
          return (
            <g key={ axis }>
              {
                this.props.axisLabel ?
                  <g>
                    <Text
                      x={ x }
                      y={ y }
                      fontSize={ this.props.textSize }
                      verticalAnchor={ y > 100 ? "start" : y < 100 ? "end" : "middle" }
                      textAnchor={ x > 10 ? "start" : x < -10 ? "end" : "middle" }
                      width={ this.props.axisLabelWrapWidth }
                      fill={ this.props.textColor }>
                      { axis }
                    </Text>
                  </g>
                : null
              }
            </g>
          )
        })}
      </g>
    )
  }

  renderAxes = () => {
    return (
      <g>
        { this.renderThreshold() }
        { this.props.axisLabel ? this.renderAxisLabels() : null }
      </g>
    )
  }

  render() {
    const sortedData = this.state.data.sort((a, b) => {
      return (a.id === this.state.activeNodeId)-(b.id === this.state.activeNodeId);
    });

    return(
      <div>
          <svg
            width={ this.props.width + this.props.margin.left + this.props.margin.right }
            height={ this.props.height + this.props.margin.top + this.props.margin.bottom }
            onClick={ this.handlePolygonClick({ id: '' }) }>
            <g
              transform={ "translate(" + ((this.props.width / 2) + this.props.margin.left) + "," + ((this.props.height / 2) + this.props.margin.top) + ")" }>
              <g className="axis-container">
                { this.renderAxes() }
              </g>
              <g className="polygons-container">
                {
                  sortedData.map(d => {
                    return (
                      <Polygon
                        key={ d.id }
                        color={ d.color || this.defaultColor }
                        points={ this.assemblePointsData(d) }
                        areaOpacity={ this.props.areaOpacity }
                        areaOpacityActive={ this.props.areaOpacityActive }
                        strokeWidth={ 0 }
                        pointRadius={ this.props.pointRadius }
                        scoreEnabled={ true }
                        score={ d.score }
                        showScore={ this.props.scoreEnabled && (sortedData.length === 1 || d.id === this.state.activeNodeId) }
                        scoreSize={ this.props.scoreSize }
                        scoreColor={ this.props.scoreColor }
                        textSize={ this.props.textSize }
                        isActive={ d.id === this.state.activeNodeId }
                        onClick={ this.handlePolygonClick(d) }
                      />
                    )
                  })
                }
              </g>
            </g>
          </svg>
      </div>
    )
  }
}

export default HGraph;
