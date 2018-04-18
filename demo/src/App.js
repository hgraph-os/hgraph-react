import React, { Component } from 'react';
import HGraph, { hGraphConvert, calculateHealthScore } from 'hgraph-react'; // symlinked with 'yarn link' from project root.

import data2017 from "./data/2017.json";
import data2018 from "./data/2018.json";

import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    const converted2017 = this.convertDataSet(data2017);
    const converted2018 = this.convertDataSet(data2018);

    const yearData = [
      {
        label: '2017',
        data: converted2017,
        score: parseInt(calculateHealthScore(converted2017), 10)
      },
      {
        label: '2018',
        data: converted2018,
        score: parseInt(calculateHealthScore(converted2018), 10)
      }
    ];


    this.state = {
      windowWidth: window.innerWidth,
      yearData,
      currentYearData: yearData[0]
    }
  }

  convertDataSet = (data) => {
    return data.map(d => {
      const converted = hGraphConvert('male', d.metric, d);
      converted.id = d.metric;
      if (d.children) {
        converted.children = d.children.map(c => {
          const convertedChild = hGraphConvert('male', c.metric, c);
          convertedChild.parentKey = c.parentKey;
          convertedChild.id = c.metric;
          return convertedChild;
        })
      }
      return converted;
    });
  }

  componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
  }

  updateWindowDimensions = () => {
    this.setState({ windowWidth: window.innerWidth });
  }

  setYearData = (index) => (e) => {
    this.setState({
      currentYearData: this.state.yearData[index]
    })
  }

  render() {
    const sizeBasedOnWindow = ((this.state.windowWidth / 3) * 2);
    const size = sizeBasedOnWindow > 600 ? 600 : sizeBasedOnWindow;

    return (
      <div className="App">
        <div className="vis-container">
          <HGraph
            data={ this.state.currentYearData.data }
            score={ this.state.currentYearData.score }
            width={ size }
            height={ size }
            fontSize={ size < 300 ? 12 : 16 }
            pointRadius={ size < 300 ? 5 : 10 }
            scoreFontSize={ size < 300 ? 60 : 120 }/>
        </div>
        <div className="controls">
          { /* TODO: Should have an option to disable point clicks entirely for these small ones */ }
          { this.state.yearData.map((data, i) => (
            <button
              key={ data.label }
              className="control"
              onClick={ this.setYearData(i) }>
              <HGraph
                data={ data.data }
                score={ data.score }
                healthyRangeFillColor={ data.label === this.state.currentYearData.label ? '#b0a9ff' : '#98bd8e' }
                width={ 100 }
                height={ 100 }
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                showScore={ false }
                showAxisLabel={ false }
                pointRadius={ 2 }
                scoreFontSize={ 18 } />
              <span className="control__label">{ data.label }</span>
            </button>
          )) }
        </div>
      </div>
    );
  }
}

export default App;
