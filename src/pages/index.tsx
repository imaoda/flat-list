import React, { Component } from 'react';
import List from '@/component/List';
import { Code, Instagram } from 'react-content-loader';
import Loading from '@/component/Loading';
import './index.less';

interface IState {
  data: any[];
  showLoading: boolean;
  version: any;
}
export default class Index extends Component<{}, IState> {
  state = {
    data: [],
    showLoading: true,
    version: 0,
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
    this.setState({ data: newData, version: this.state.version + 1 });
    close();
  };

  renderItem = index => {
    const { data } = this.state;
    const price = data[index];
    console.log(11);
    return (
      <div className="item-suit">
        <div className={`item-logo item-img-${(index + parseInt(price)) % 6}`}></div>
        <div className="text">
          <div className="item-name">Apple旗舰店销量排行 No.{index + 1} 商品</div>
          <div className="tip">
            <span className="tip-info">好评如潮</span>
            <span className="tip-info">多买优惠</span>
          </div>
          <div className="item-price">￥{price}.00</div>
          <div className="evaluate">20万+条评价 98%好评</div>
        </div>
      </div>
    );
  };

  render() {
    const header = <div className="slider" />;
    const footer = <div className="loading-more">加载更多...</div>;
    const { data, showLoading, version } = this.state;
    const loading = (
      <div className="loading">
        <Loading />
      </div>
    );

    return (
      <div className="page-home">
        <List
          itemCount={data.length}
          itemSize={130}
          indicator={loading}
          headerSize={160}
          header={header}
          footer={footer}
          onPullDown={this.onPullDown}
          onReachBottom={this.onReachBottom}
          version={version}
        >
          {this.renderItem}
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
