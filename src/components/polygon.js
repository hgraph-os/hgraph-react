import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { easeExp } from 'd3-ease';
import Animate from 'react-move/Animate';
import NodeGroup from 'react-move/NodeGroup';

class Polygon extends Component {

  static propTypes = {
    points: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string.isRequired,
      color: PropTypes.string,
      cx: PropTypes.number.isRequired,
      cy: PropTypes.number.isRequired,
      activeCx: PropTypes.number.isRequired,
      activeCy: PropTypes.number.isRequired,
      activeText: PropTypes.string.isRequired,
    })).isRequired,
    color: PropTypes.string,
    areaOpacity: PropTypes.number,
    strokeWidth: PropTypes.number,
    strokeColor: PropTypes.string,
    pointRadius: PropTypes.number,
    activePointRadius: PropTypes.number,
    scoreEnabled: PropTypes.bool,
    showScore: PropTypes.bool,
    scorecolor: PropTypes.string,
    scoreSize: PropTypes.string,
    isActive: PropTypes.bool
  }

  static defaultProps = {
    color: '#000',
    areaOpacity: 0.25,
    strokeWidth: 1,
    pointRadius: 4,
    activePointRadius: 20,
    scoreEnabled: false,
    showScore: false,
    scoreColor: '#000',
    scoreSize: "80px",
    isActive: false
  }

  assemblePointsStr = (points) => {
    let str = "";
    points.forEach((val, i) => {
      str += `${val.cx},${val.cy} `;
    });
    return str;
  }

  handleClick = (e) => {
    e.stopPropagation();
    this.props.onClick();
  }

  renderArea = () => {
    const pointsStr = this.assemblePointsStr(this.props.points);
    return (
      <Animate
        start={{
          pointsStr: pointsStr,
          fillOpacity: this.props.isActive ? .7 : this.props.areaOpacity
        }}
        enter={{
          pointsStr: pointsStr,
          fillOpacity: this.props.isActive ? .7 : this.props.areaOpacity
        }}
        update={[
          {
            pointsStr: [pointsStr],
            timing: { duration: 750, ease: easeExp }
          },
          {
            fillOpacity: [this.props.isActive ? .7 : this.props.areaOpacity],
            timing: { duration: 250, ease: easeExp }
          }
        ]}
      >
        {(state) => {
          return (
            <polygon
              className="polygon"
              points={ state.pointsStr }
              stroke={ this.props.strokeColor || this.props.color }
              strokeWidth={ this.props.strokeWidth }
              fill={ this.props.color }
              fillOpacity={ state.fillOpacity }
              onClick={ this.handleClick }>
            </polygon>
          );
        }}
      </Animate>
    )
  }

  renderPoints = (data) => {
    return (
      <g className="polygon__points-wrapper">
        <NodeGroup
          data={ data }
          keyAccessor={ (d) => d.key }
          start={(d, index) => ({
            cx: d.cx,
            cy: d.cy,
            activeCx: d.activeCx,
            activeCy: d.activeCy,
            pointRadius: this.props.pointRadius,
            color: d.color || this.props.color,
            activeOpacity: this.props.isActive ? 1 : 0
          })}
          enter={(d, index) => ({
            cx: d.cx,
            cy: d.cy,
            activeCx: d.activeCx,
            activeCy: d.activeCy,
            pointRadius: this.props.pointRadius,
            color: d.color || this.props.color,
            activeOpacity: this.props.isActive ? 1 : 0
          })}
          update={(d, index) => ([
            {
              cx: [d.cx],
              cy: [d.cy],
              activeCx: [d.activeCx],
              activeCy: [d.activeCy],
              pointRadius: [this.props.pointRadius],
              color: [d.color || this.props.color],
              timing: { duration: 750, ease: easeExp }
            },
            {
              activeOpacity: [this.props.isActive ? 1 : 0],
              timing: { duration: 250, ease: easeExp }
            }
          ])}
        >
          {(nodes) => {
            return (
              <g>
                {nodes.map(({ key, data, state }) => {
                  return (
                    <g key={ data.key }>
                      <circle
                        className="polygon__point"
                        r={ state.pointRadius }
                        cx={ state.cx }
                        cy={ state.cy }
                        fill={ state.color }>
                      </circle>
                      <g opacity={ state.activeOpacity } className="polygon__active-point-wrapper">
                        <circle
                          r={ this.props.activePointRadius }
                          cx={ state.activeCx }
                          cy={ state.activeCy }
                          fill={ state.color }>
                        </circle>
                        <text
                          x={ state.activeCx }
                          y={ state.activeCy }
                          fontSize="20px"
                          fill="#fff">
                          <tspan
                            alignmentBaseline="middle"
                            textAnchor="middle">
                            { data.activeText }
                          </tspan>
                          <tspan
                            alignmentBaseline="middle"
                            textAnchor="middle"
                            fontSize="10px">
                            %
                          </tspan>
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>
            );
          }}
        </NodeGroup>
      </g>
    );
  }

  renderScore = () => {
    const transitionObj = {
      opacity: [this.props.showScore ? 1 : this.props.isActive ? 1 : 0],
      timing: { duration: 250, ease: easeExp }
    };
    return (
      <Animate
        start={transitionObj}
        enter={transitionObj}
        update={transitionObj}
        leave={transitionObj}
      >
        {(state) => {
          return (
            <text
              opacity={ state.opacity }
              x="0"
              y="0"
              dy={ parseInt(parseInt(this.props.scoreSize, 10) / 2.5, 10) + "px" }
              textAnchor="middle"
              fontSize={ this.props.scoreSize }
              fontWeight="bold"
              pointerEvents="none"
              fill={ this.props.scoreColor }>
                { this.props.score }
            </text>
          )
        }}
      </Animate>
    )
  }

  render() {
    return(
      <g className="polygon-wrapper">
        { this.renderArea() }
        { this.renderPoints(this.props.points) }
        { this.props.scoreEnabled ? this.renderScore() : null }
      </g>
    )
  }
}

export default Polygon;
