import React, { Component } from 'react';
import List from '@/component/List';
import { Code, Instagram } from 'react-content-loader';
import Loading from '@/component/Loading';
import './index.less';

export default class Index extends Component<{}, { data: any[]; showLoading: boolean }> {
  state = {
    data: [],
    showLoading: true,
  };
  async componentDidMount() {
    const data = await this.fetchData();
    this.setState({ data }, () => {
      setTimeout(() => {
        this.setState({ showLoading: false });
      }, 50);
    });
  }

  async fetchData() {
    // 模拟请求数据
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Array(20).fill((Math.random() * 1000).toFixed(0));
  }

  onReachBottom = async () => {
    const newData = await this.fetchData();
    const { data } = this.state;
    const allData = [...data, ...newData];
    this.setState({ data: allData });
  };

  onPullDown = async close => {
    const newData = await this.fetchData();
    this.setState({ data: newData });
    close();
  };

  render() {
    const header = <div className="slider" />;
    const footer = <div className="loading-more">加载更多...</div>;
    const { data, showLoading } = this.state;
    const loading = (
      <div className="loading">
        <Loading />
      </div>
    );

    return (
      <div className="page-home">
        <List
          itemCount={data.length}
          itemSize={200}
          indicator={loading}
          headerSize={160}
          header={header}
          footer={footer}
          onPullDown={this.onPullDown}
          onReachBottom={this.onReachBottom}
        >
          {index => <div>{index}</div>}
        </List>
        {showLoading && (
          <div className="page-loading">
            <Instagram />
            <Code />
            <Code />
            <Code />
            <Code />
          </div>
        )}
      </div>
    );
  }
}
