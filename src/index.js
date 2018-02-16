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
      color: PropTypes.string.isRequired,
      values: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
        healthyMin: PropTypes.number.isRequired,
        healthyMax: PropTypes.number.isRequired,
        absoluteMin: PropTypes.number.isRequired,
        absoluteMax: PropTypes.number.isRequired,
        units: PropTypes.string.isRequired
      })),
      score: PropTypes.number.isRequired
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
    pointRadius: PropTypes.number,
    // TODO: Return to activePoint stuffs
    activePointOffset: PropTypes.number,
    scoreEnabled: PropTypes.bool,
  };

  static defaultProps = {
    width: 500,
    height: 500,
    margin: { top: 50, right: 50, bottom: 50, left: 50 },
    absoluteMin: 0,
    absoluteMax: 1,
    thresholdMin: .25,
    thresholdMax: .75,
    axisLabel: true,
    axisLabelOffset: 1.1,
    axisLabelWrapWidth: 60,
    highlight: false,
    highlightStrokeColor: '#8F85FF',
    areaOpacity: 0.5,
    pointRadius: 10,
    // TODO: Return to activePoint stuffs
    activePointOffset: 0.025,
    scoreEnabled: true,
  }

  constructor(props) {
    super(props);

    this.state = {
      data: props.data || [],
      activeNodeId: ''
    };

    this.Format = format('.0%');

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
    return data.values.map((val, i) => {
      const percentageFromValue = this.convertValueToHgraphPercentage(val);
      return {
        key: val.label.replace(/\s/g,''),
        value: val.value,
        cx: this.scaleRadial(percentageFromValue) * Math.cos(this.angleSlice * i - Math.PI / 2),
        cy: this.scaleRadial(percentageFromValue) * Math.sin(this.angleSlice * i - Math.PI / 2),
        activeCx: this.scaleRadial(parseFloat(percentageFromValue) + this.props.activePointOffset) * Math.cos(this.angleSlice * i - Math.PI / 2),
        activeCy: this.scaleRadial(parseFloat(percentageFromValue) + this.props.activePointOffset) * Math.sin(this.angleSlice * i - Math.PI / 2),
        color: this.thresholdColor(percentageFromValue, data.color),
        activeText: this.Format(percentageFromValue).slice(0, -1)
      };
    });
  }

  thresholdColor = (value, color) => {
    return (value < this.props.thresholdMin || value > this.props.thresholdMax) ? '#e1604f' : color;
  }

  renderThreshold = () => {
    const tau = 2 * Math.PI;
    const healthyArc = arc()
      .outerRadius(this.scaleRadial(this.props.thresholdMax))
      .innerRadius(this.scaleRadial(this.props.thresholdMin))
      .startAngle(0)
      .endAngle(tau);
    const totalArc = arc()
      .outerRadius(this.scaleRadial(0))
      .innerRadius(this.scaleRadial(1))
      .startAngle(0)
      .endAngle(tau);
    return (
      <g>
        <path
          d={ totalArc() }
          fill={'#000' }
          fillOpacity=".05">
        </path>
        <path
          d={ healthyArc() }
          fill={ this.props.highlight ? this.props.highlightStrokeColor : '#97be8c' }
          fillOpacity=".75">
        </path>
      </g>
    )
  }

  renderAxisLabels = () => {
    return (
      <g>
        {this.allAxis.map((axis, i) => {
          return (
            <g key={ axis }>
              {
                this.props.axisLabel ?
                  <Text
                    x={ this.scaleRadial(this.absoluteMax * this.props.labelOffset) * Math.cos(this.angleSlice * i - Math.PI / 2) }
                    y={ this.scaleRadial(this.absoluteMax * this.props.labelOffset) * Math.sin(this.angleSlice * i - Math.PI / 2) }
                    dy=".35em"
                    fontSize="12px"
                    textAnchor="middle"
                    width={ this.props.axisLabelWrapWidth }>
                    { axis }
                  </Text>
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
                        color={ d.color }
                        points={ this.assemblePointsData(d) }
                        areaOpacity={ this.props.areaOpacity }
                        strokeWidth={ 0 }
                        pointRadius={ this.props.pointRadius }
                        scoreEnabled={ true }
                        score={ d.score }
                        showScore={ this.props.scoreEnabled && (sortedData.length === 1 || d.id === this.state.activeNodeId) }
                        scoreSize={ this.props.scoreSize }
                        scoreColor={ this.props.scoreColor }
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
