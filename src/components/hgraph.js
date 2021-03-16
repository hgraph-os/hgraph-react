import React, { Component, useState } from 'react';
import PropTypes from 'prop-types';
import { arc } from 'd3-shape';
import { format } from 'd3-format';
import { scaleLinear } from 'd3-scale';
import { easeExp, easeElastic } from 'd3-ease';
import Animate from 'react-move/Animate';
import NodeGroup from 'react-move/NodeGroup';
import Text from 'react-svg-text';

export function HGraph(props){

  let absoluteMin = 0;
  let absoluteMax = 1;

  let [state, setState] = useState({
    data: props.data,
    activePointId: '',
    zoomed: false,
    zoomCoords: [0, 0],
    zoomFactor: 1,
    points: points,
    path: assemblePath(points),
    animatingChildren: false,
    suppressTransition: false
  })


  const points = assemblePoints(props.data);



  setGlobalConfig(props, false);




  function setGlobalConfig(props, shouldSetState = true){
    labelConfigurationHeightCutoff = props.height / 6;
    labelConfigurationWidthCutoff = props.width * .1;
    radius = Math.min((props.width / 2), (props.height / 2));
    rangeBottom = radius * props.donutHoleFactor;
    angleSlice = (Math.PI * 2) / props.data.length;

    scaleRadial = scaleLinear()
      .domain([absoluteMin, absoluteMax])
      .range([rangeBottom, radius]);

    if (shouldSetState) {
      const points = assemblePoints(props.data);

      setState({
        data: props.data,
        points,
        path: assemblePath(points)
      });
    }
  }

  function convertValueToHgraphPercentage(valueObject){
    const { value, healthyMin, healthyMax, absoluteMin, absoluteMax } = valueObject;
    let scale;

    // Do some error checking
    // TODO: Need to provide more info on which object etc. for user here
    if (absoluteMin > absoluteMax) {
      throw "absoluteMin is higher than absoluteMax."
    } else if (
      healthyMin < absoluteMin
      || healthyMax < absoluteMin
      || healthyMax > absoluteMax
      || healthyMin > absoluteMax) {
      throw "Healthy range extends outside of absolute range."
    }

    if (healthyMin === healthyMax && value === healthyMax) {
      // Possible rare case where only healthy "range" is a single value
      // and the current value is healthy
      return props.thresholdMax - props.thresholdMin;
    }
    else if (value < healthyMin) {
      scale = scaleLinear()
        .domain([absoluteMin, healthyMin])
        .range([absoluteMin, props.thresholdMin]);
    } else if (value > healthyMax) {
      scale = scaleLinear()
        .domain([healthyMax, absoluteMax])
        .range([props.thresholdMax, absoluteMax]);
    } else {
      scale = scaleLinear()
        .domain([healthyMin, healthyMax])
        .range([props.thresholdMin, props.thresholdMax]);
    }
    return scale(value);
  }

  function handleSvgClick(e){
    if (state.zoomed) {
      zoomOut();
    }
  }

  // this syntax seems overly clever
  // function handlePointClick = (d) => (e) => {
  function handlePointClick(d, e){
    if (props.zoomOnPointClick) {
      e.stopPropagation();

      const cos = Math.cos(d.angle - Math.PI / 2);
      const sin = Math.sin(d.angle - Math.PI / 2);

      const cx = scaleRadial(.5) * cos;
      const cy = scaleRadial(.5) * sin;

      if (state.zoomed && d.key === state.activePointId) {
        zoomOut();
      } else {
        if (!state.zoomed) {
          addChildren();
        }
        setState({
          activePointId: d.key,
          zoomed: true,
          zoomCoords: [cx, cy],
          zoomFactor: props.zoomFactor
        });
      }
    }

    if (props.onPointClick) {
      props.onPointClick(d.originalData ? d.originalData : d, e);
    }
  }

  function zoomOut(){
    removeChildren();
    setState({
      activePointId: '',
      zoomed: false,
      zoomCoords: [0, 0],
      zoomFactor: 1
    });
  }

  function buildPoint(d, percentageFromValue){
    const cos = Math.cos(d.angle - Math.PI / 2);
    const sin = Math.sin(d.angle - Math.PI / 2);

    const isAboveMidPoint = percentageFromValue > (props.thresholdMax - props.thresholdMin);
    const isUnhealthilyHigh = percentageFromValue > props.thresholdMax;

    const cx = scaleRadial(percentageFromValue) * cos;
    const cy = scaleRadial(percentageFromValue) * sin;

    const labelShouldRenderInside = isUnhealthilyHigh || (isAboveMidPoint && cy < labelConfigurationHeightCutoff && cy > -labelConfigurationHeightCutoff);

    const labelOffset = labelShouldRenderInside ? -props.pointLabelOffset : props.pointLabelOffset;
    const labelPosition = parseFloat(percentageFromValue);
    const activeCx = (scaleRadial(labelPosition) + labelOffset) * cos;
    const activeCy = (scaleRadial(labelPosition) + labelOffset) * sin;

    const textAnchor =
      labelShouldRenderInside && cx < labelConfigurationWidthCutoff && cx > -labelConfigurationWidthCutoff ? 'middle'
        : labelShouldRenderInside && cx < -labelConfigurationWidthCutoff ? 'start'
        : labelShouldRenderInside && cx > labelConfigurationWidthCutoff ? 'end'
        : cx < -labelConfigurationWidthCutoff ? 'end'
        : cx > labelConfigurationWidthCutoff ? 'start'
        : 'middle';

    const verticalAnchor =
      labelShouldRenderInside && cy < labelConfigurationHeightCutoff ? 'start'
        : labelShouldRenderInside && cy > labelConfigurationHeightCutoff ? 'end'
        : labelShouldRenderInside ? 'middle'
        : cy < labelConfigurationHeightCutoff ? 'end'
        : cy > labelConfigurationHeightCutoff ? 'start'
        : 'middle';

    const originalData = Object.assign({}, d);
    delete originalData.angle;
    delete originalData.isChild;

    return {
      key: d.id,
      value: d.value,
      angle: d.angle,
      cx: d.cx || cx,
      cy: d.cy || cy,
      activeCx,
      activeCy,
      color: thresholdColor(percentageFromValue, props.color),
      fontColor: thresholdColor(percentageFromValue, props.fontColor),
      unitLabel: d.unitLabel,
      textAnchor,
      verticalAnchor,
      isChild: d.isChild || false,
      children: d.children || null,
      originalData
    };
  }

  function assemblePath(points){
    let fillString = '';

    points.map((p, i) => {
      fillString += (i === 0 ? 'M ' : 'L ') + p.cx + ' ' + p.cy + ' ';
    });

    return fillString;
  }

  function assemblePoints(data, addingChildren = false){
    const points = data.map((d, i) => {
      const percentageFromValue = convertValueToHgraphPercentage(d);
      d.angle = addingChildren && d.angle ? d.angle : angleSlice * i;

      return buildPoint(d, percentageFromValue);
    });

    return [].concat.apply([], points);
  }

  function assembleIntrimChildPointsForPoint(point, dataIndex, distance, vector, angleSliceSubdivision){
    return point.children.map((c, i) => {
      const copy = Object.assign({}, c);
      const frac = 1 / angleSliceSubdivision;
      copy.cx = point.cx + (distance * (frac * (i + 1))) * vector[0];
      copy.cy = point.cy + (distance * (frac * (i + 1))) * vector[1];
      copy.isChild = true;
      copy.angle = (angleSlice * dataIndex) + ((angleSlice / angleSliceSubdivision) * (i + 1));
      return copy;
    });
  }

  function getDistanceAndVectorBetweenPoints(point, siblingPoint){
    const vector = [(siblingPoint.cx - point.cx), (siblingPoint.cy - point.cy)];
    const distance = Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
    const vectorNormalized = [vector[0] / distance, vector[1] / distance];

    return {
      distance,
      vector: vectorNormalized
    }
  }

  function addChildren(){
    // Copy the state data
    let finalData = state.data.map(d => d);
    let intrimData = state.data.map(d => d);
    let groupsInserted = 0;

    // For any point with children, build and add the child points
    state.data.forEach((data, i) => {
      if (data.children && data.children.length) {
        const dataIndex = i;
        const spliceIndex = dataIndex + 1 + groupsInserted;
        const point = state.points[i];
        const siblingPoint = state.points[dataIndex + 1];
        const angleSliceSubdivision = point.children.length + 1;
        const { distance, vector } = getDistanceAndVectorBetweenPoints(point, siblingPoint);
        const pointsIntrimChildren = assembleIntrimChildPointsForPoint(point, dataIndex, distance, vector, angleSliceSubdivision);

        point.children.map((c, i) => {
          c.angle = (angleSlice * dataIndex) + ((angleSlice / angleSliceSubdivision) * (i + 1));
          c.isChild = true;
          return c;
        });

        intrimData.splice(spliceIndex, 0, pointsIntrimChildren);
        finalData.splice(spliceIndex, 0, point.children);

        groupsInserted += 1;
      }
    });

    // Flatten for the arrays added in
    intrimData = [].concat.apply([], intrimData);
    finalData = [].concat.apply([], finalData);

    const intrimPoints = assemblePoints(intrimData, true);
    const intrimPath = assemblePath(intrimPoints);
    const finalPoints = assemblePoints(finalData, true);

    setState({
      data: intrimData,
      points: intrimPoints,
      path: intrimPath,
      returnIntrimData: intrimData,
      returnIntrimPoints: intrimPoints,
      returnIntrimPath: intrimPath,
      animatingChildren: true,
      suppressTransition: true
    }, () => {
      setState({
        data: finalData,
        points: finalPoints,
        path: assemblePath(finalPoints),
        suppressTransition: false
      });
    });
  }

  function removeChildren(){
    const finalData = state.data.filter(d => !d.isChild);
    const finalPoints = assemblePoints(finalData);
    const finalPath = assemblePath(finalPoints);

    if (state.returnIntrimData) {
      setState({
        data: state.returnIntrimData,
        points: state.returnIntrimPoints,
        path: state.returnIntrimPath,
        animatingChildren: true,
        suppressTransition: false,
      }, () => {
        setTimeout(() => {
          setState({
            data: finalData,
            points: finalPoints,
            path: finalPath,
            returnIntrimData: null,
            returnIntrimPoints: null,
            returnIntrimPath: null,
            animatingChildren: true,
            suppressTransition: true
          }, () => {
            setState({
              animatingChildren: false,
              suppressTransition: false
            });
          });
        }, props.zoomTransitionTime + 50);
      });
    } else {
      setState({
        data: finalData,
        points: finalPoints,
        path: finalPath,
        animatingChildren: true,
        suppressTransition: true
      }, () => {
        setState({
          animatingChildren: false,
          suppressTransition: false
        });
      });
    }
  }

  function thresholdColor(value, color){
    return (value < props.thresholdMin || value > props.thresholdMax) ? '#df6053' : color;
  }

  function renderThreshold(){
    const tau = 2 * Math.PI;
    const healthyArc = arc()
      .outerRadius(scaleRadial(props.thresholdMax))
      .innerRadius(scaleRadial(props.thresholdMin))
      .startAngle(0)
      .endAngle(tau);
    // NOTE: totalArc just here for dev purposes for now
    const totalArc = arc()
      .outerRadius(scaleRadial(0))
      .innerRadius(scaleRadial(1))
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
          fill={ props.healthyRangeFillColor }
          fillOpacity="1">
        </path>
      </g>
    )
  }

  function renderAxisLabels(fontSize){
    return (
      <g>
        {state.data.map((d, i) => {
          const x = (scaleRadial(absoluteMax) + props.axisLabelOffset) * Math.cos(d.angle - Math.PI / 2);
          const y = (scaleRadial(absoluteMax) + props.axisLabelOffset) * Math.sin(d.angle - Math.PI / 2);

          return (
            <g key={ d.id } className="hgraph__axis-label">
              <Text
                x={ x }
                y={ y }
                fontSize={ fontSize }
                verticalAnchor={ y > 100 ? "start" : y < 100 ? "end" : "middle" }
                textAnchor={ x > 10 ? "start" : x < -10 ? "end" : "middle" }
                width={ props.axisLabelWrapWidth }
                fill={ props.fontColor }
                onClick={ handlePointClick(d) }>
                { d.label }
              </Text>
            </g>
          )
        })}
      </g>
    )
  }

  function renderAxes(fontSize){
    return (
      <g>
        { renderThreshold() }
        { props.showAxisLabel ? renderAxisLabels(fontSize) : null }
      </g>
    )
  }

  function renderPoints(points, globalState){
    return (
      <NodeGroup
        data={ points }
        keyAccessor={ (d) => d.key }
        start={(d, index) => {
          return {
            cx: d.cx,
            cy: d.cy,
            textOpacity: 0,
            r: d.isChild ? 0 : props.pointRadius / state.zoomFactor,
            opacity: d.isChild ? 0 : 1
          }
        }}
        enter={(d, index) => {
          return {
            cx: d.cx,
            cy: d.cy,
            textOpacity: 0,
            r: d.isChild ? 0 : props.pointRadius / state.zoomFactor,
            opacity: d.isChild ? 0 : 1
          }
        }}
        update={(d, index) => {
          const { zoomed } = state;
          const radius = props.pointRadius / state.zoomFactor;
          return [
            {
              cx: state.suppressTransition ? d.cx : [d.cx],
              cy: state.suppressTransition ? d.cy : [d.cy],
              color: [d.color],
              r: !zoomed && d.isChild ? [1] : d.isChild ? [radius * .75] : [radius],
              opacity: !zoomed && d.isChild ? [0] : [1],
              timing: {
                duration: props.zoomTransitionTime,
                ease: d.isChild ? easeElastic : easeExp,
                delay:
                  !state.animatingChildren ? 0 :
                  (zoomed && !d.isChild) ? 0 :
                  (zoomed && d.isChild) ? props.zoomTransitionTime :
                  (!zoomed && !d.isChild) ? props.zoomTransitionTime :
                  (!zoomed && d.isChild) ? 0 : 0
              }
            },
            {
              textOpacity: state.zoomed ? [1] : 0,
              timing: {
                duration: props.zoomTransitionTime,
                ease: easeExp,
                delay:
                  (zoomed && !d.isChild) ? 0 :
                  (zoomed && d.isChild) ? props.zoomTransitionTime :
                  (!zoomed && !d.isChild) ? props.zoomTransitionTime :
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
                      fill={ state.color || data.color }
                      cx={ state.cx }
                      cy={ state.cy }
                      opacity={ state.opacity }>
                    </circle>
                    <circle
                      className="polygon__point-hitbox"
                      r={ props.hitboxRadius || state.r }
                      cx={ state.cx }
                      cy={ state.cy }
                      opacity="0"
                      onClick={ handlePointClick(data) }>
                    </circle>
                    <Text
                      opacity={ state.textOpacity }
                      width={ props.pointLabelWrapWidth }
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
    )
  }


  return(
    <div>
        <svg
          className="hgraph"
          width={ props.width + props.margin.left + props.margin.right }
          height={ props.height + props.margin.top + props.margin.bottom }
          onClick={ handleSvgClick }>
          <g
            transform={ "translate(" + ((props.width / 2) + props.margin.left) + "," + ((props.height / 2) + props.margin.top) + ")" }>
            <Animate
              start={{
                path: state.path,
                zoomFactor: state.zoomFactor,
                zoomCoords: state.zoomCoords,
                fontSize: props.fontSize / state.zoomFactor,
                pointRadius: props.pointRadius / state.zoomFactor
              }}
              enter={{
                path: state.path,
                zoomFactor: state.zoomFactor,
                zoomCoords: state.zoomCoords,
                fontSize: props.fontSize / state.zoomFactor,
                pointRadius: props.pointRadius / state.zoomFactor
              }}
              update={[
                {
                  d: state.suppressTransition ? state.path : [state.path],
                  timing: {
                    duration: props.zoomTransitionTime,
                    ease: state.animatingChildren ? easeElastic : easeExp,
                    delay: state.animatingChildren && state.zoomed ? props.zoomTransitionTime : 0
                  },
                  events: {
                    end() {
                      setState({
                        animatingChildren: false
                      });
                    }
                  }
                },
                {
                  zoomFactor: [state.zoomFactor],
                  zoomCoords: [state.zoomCoords],
                  fontSize: [props.fontSize / state.zoomFactor],
                  pointRadius: [props.pointRadius / state.zoomFactor],
                  timing: {
                    duration: props.zoomTransitionTime,
                    ease: easeExp,
                    delay: state.zoomed ? 0 : props.zoomTransitionTime
                  }
                }
              ]}>
              {(globalState) => {
                return (
                  <g
                    className="zoom-layer"
                    transform={ `scale(${ globalState.zoomFactor }) translate(${ -globalState.zoomCoords[0] || 0 }, ${ -globalState.zoomCoords[1] || 0 })` }>
                    <g className="axis-container">
                      { renderAxes(globalState.fontSize) }
                    </g>
                    <g className="path-container">
                      <path
                        d={ globalState.d }
                        fill={ props.color }
                        opacity={ props.areaOpacity }
                      />
                    </g>
                    <g className="points-container">
                      { renderPoints(state.points, globalState) }
                    </g>
                    <g className="score-container">
                      <Text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        verticalAnchor="middle"
                        fontSize={ props.scoreFontSize }
                        fontWeight="bold"
                        pointerEvents="none"
                        fill={ props.scoreFontColor }>
                          { props.score }
                      </Text>
                    </g>
                  </g>
                )
              }}
            </Animate>
          </g>
        </svg>
    </div>
  )
}

HGraph.propTypes = {
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
  hitboxRadius: PropTypes.number,
  showScore: PropTypes.bool,
  scoreFontSize: PropTypes.number,
  scoreFontColor: PropTypes.string,
  zoomFactor: PropTypes.number,
  zoomTransitionTime: PropTypes.number,
  zoomOnPointClick: PropTypes.bool,
  onPointClick: PropTypes.func,
};

HGraph.defaultProps = {
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
  axisLabelWrapWidth: 120,
  areaOpacity: 0.25,
  pointRadius: 10,
  pointLabelOffset: 8,
  pointLabelWrapWidth: null,
  showScore: true,
  scoreFontSize: 120,
  scoreFontColor: '#000',
  zoomFactor: 2.25,
  zoomTransitionTime: 750,
  zoomOnPointClick: true,
}



export default HGraph;
