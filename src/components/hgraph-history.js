import React, { Component } from 'react'
import PropTypes from 'prop-types'
// import { format } from 'd3-format'
import { line as d3Line } from 'd3-shape'
import { scaleTime, scaleLinear } from 'd3-scale'
// import { easeExp, easeElastic } from 'd3-ease'
// import Animate from 'react-move/Animate'
// import NodeGroup from 'react-move/NodeGroup'
// import Text from 'react-svg-text'

export class History extends Component {
  render() {
    const { width, height } = this.props,
          dates = this.props.data.values.map(d => new Date(d.date)),
          values = this.props.data.values.map(d => d.value)

    const xScale =
      scaleTime()
        .domain([dates[0], dates[dates.length - 1]])
        .range([0, width])

    const yScale =
      scaleLinear()
        .domain([this.props.data.absoluteMin, this.props.data.absoluteMax])
        .range([height, 0])

    const line = d3Line()
            .x((d) => xScale(new Date(d.date)))
            .y((d) => yScale(d.value));

    return (
      <div className="hgraph-history">
        <svg width={width} height={height}>
          <rect
            x={0}
            y={yScale(this.props.data.healthyMax)}
            width={width}
            height={yScale(this.props.data.healthyMax - this.props.data.healthyMin)}
            fill="#98bd8e"
          />
          <path
            className="hgraph-history__line"
            fill="none"
            stroke="#616363"
            d={line(this.props.data.values)}
          />
          <g>
            { this.props.data.values.map(d => {
              return (
                <circle
                  cx={xScale(new Date(d.date))}
                  cy={yScale(d.value)}
                  r={5}
                  fill={ d.value > this.props.data.healthyMax || d.value < this.props.data.healthyMin ? '#df6053' : '#616363' }
                />
              )
            })}
          </g>
        </svg>
      </div>
    )
  }
}
