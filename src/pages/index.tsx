import React, { Component } from 'react';
import List from '@/component/List';
import './index.less';

export default class index extends Component {
  render() {
    return (
      <div className="page-home">
        <List itemCount={100} itemSize={200} header="haha" headerSize={30}>
          {index => <div>{index}</div>}
        </List>
      </div>
    );
  }
}