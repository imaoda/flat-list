import React, { Component, CSSProperties } from 'react';
import nobounce from 'no-bounce';
nobounce();

interface IProps {
  height?: number; // 如果不设置，则默认吃满父元素，比如父元素 flex：1
  itemCount: number; // 刷新过程中不支持减少
  itemSize: number;
  width?: number | string;
  windowSize: number; // 缓冲区窗口大小
  header: React.ReactNode;
  headerSize: number; // 顶部元素高度
  footer: React.ReactNode;
  children: (index: number) => React.ReactNode;
  onReachBottom: Function; // 触底事件
  onPullDown: Function; // 下拉事件
  indicator: React.ReactNode; // 下拉刷新时上面的菊花
  version: any; // 用于在 itemCount 相同的情况下，强制刷新
}

interface IState {
  visibility: boolean[];
  styles: CSSProperties[];
  windowSize: number;
  reachTop: boolean; // 是否在顶端，在顶端的时候是正常布局（非 absolute），为了确保下拉刷新是 ok 的
}

const wait = time => new Promise(resolve => setTimeout(resolve, time));
const calcDefaultWindowSize = itemSize => Math.ceil((800 * 3) / itemSize);

export default class ListHOC extends Component<IProps, IState> {
  static defaultProps = {
    windowSize: 0, // 如果是 0，则动态计算
    header: null,
    footer: null,
    headerSize: 0,
    onReachBottom: () => {},
    onPullDown: () => {},
    indicator: <div>刷新中...</div>,
    version: 0,
  };

  state: IState = {
    reachTop: true,
    visibility: new Array(this.props.itemCount).fill(false),
    styles: new Array(this.props.itemCount).fill(0).map((v, k) => ({
      position: 'absolute',
      left: 0,
      height: this.props.itemSize,
      width: '100%',
      top: this.props.itemSize * k + (this.props.headerSize || 0),
    })),
    windowSize: this.props.windowSize || calcDefaultWindowSize(this.props.itemSize),
  };

  dom: any = null;

  indicatorInfo: any = {
    dom: null,
    height: 0,
  };

  // 触发过一次触底刷新后，需间隔1s才能再触发
  stopCheckBottom: any = false;

  // 滚动事件节流
  stopHandleScroll: any = false;

  // 不在 touchstart 处理下拉逻辑，比如正在收回 indicator 或者已经出发下拉刷新态
  stopHandleTouch: any = false;

  // 记录上一次 scroll 事件的 scrollTop 用于判断滚动方向
  lastScrolltop: any = 0;

  // 是否需要监听下拉刷新，如果
  pullDown = {
    startTouchPos: 0, // 记录 toustart 时手指的位置
    lastTouchPos: 0,
    startScrollTop: 0,
  };

  componentDidMount() {
    this.dom.addEventListener('scroll', this.handleScroll);
    this.dom.addEventListener('touchstart', this.handleTouchStart);
    this.dom.addEventListener('touchmove', this.handleTouchMove);
    this.dom.addEventListener('touchend', this.handleTouchEnd);

    this.indicatorInfo.height = this.indicatorInfo.dom.clientHeight; // 实时计算 indicator 的高度
    this.setIndicatorHeight(0);
    this.handleScroll({ target: { scrollTop: 0 } });
  }

  shouldComponentUpdate(nextProps, nextState) {
    // 列表长度变化才更新画布长度，列表的实际渲染其实在 slot 里
    if (nextProps.itemCount !== this.props.itemCount) return true;
    if (nextProps.version !== this.props.version) return true;
    if (nextState.visibility !== this.state.visibility) return true;
    if (nextState.reachTop !== this.state.reachTop) return true;
    return false;
  }

  async componentDidUpdate(prevProps) {
    const { itemSize, itemCount, windowSize, headerSize = 0 } = this.props;
    // 父组件例行刷新不处理
    if (prevProps.itemCount === itemCount) return;

    await wait(50); // 等滚轮刷新好

    // 更新最新的 visibility style 函数，只需长度 ok 即可，是否显示由 handleScroll 来设置
    // eslint-disable-next-line react/no-access-state-in-setstate
    let visibility = this.state.visibility.slice(0, itemCount);
    const delta = itemCount - visibility.length;
    if (delta > 0) {
      visibility = visibility.concat(new Array(delta).fill(false));
    }
    // eslint-disable-next-line react/no-did-update-set-state
    this.setState({
      windowSize: windowSize || calcDefaultWindowSize(itemSize),
      visibility,
      styles: new Array(itemCount).fill(0).map((v, k) => ({
        position: 'absolute',
        left: 0,
        height: itemSize,
        width: '100%',
        top: itemSize * k + headerSize,
      })),
    });

    // 异步中的 sst 是同步的
    this.handleScroll({ target: { scrollTop: this.dom.scrollTop } });
  }

  componentWillUnmount() {
    this.dom.removeEventListener('scroll', this.handleScroll);
    this.dom.removeEventListener('touchstart', this.handleTouchStart);
    this.dom.removeEventListener('touchmove', this.handleTouchMove);
    this.dom.removeEventListener('touchend', this.handleTouchEnd);
  }

  setIndicatorHeight(height) {
    if (height < 0) return;
    // 设置非线性下拉，避免一下拉太多，height 越大，拉的越慢
    const realmove = Math.sqrt(height) * 4;
    this.indicatorInfo.dom.style.marginTop = `${realmove - this.indicatorInfo.height}px`;
  }

  setIndicatorHeightSmoothly(targetMarginTop) {
    const currentMarginTop = parseFloat(this.indicatorInfo.dom.style.marginTop.slice(0, -2));
    const proximateStep = (targetMarginTop - currentMarginTop) / 15; // 20 帧内完成动画
    let doingMarginTop = currentMarginTop;
    // console.log(currentMarginTop, targetMarginTop);

    const changeMargin = () => {
      requestAnimationFrame(() => {
        doingMarginTop += proximateStep;
        this.indicatorInfo.dom.style.marginTop = `${doingMarginTop}px`;
        if (doingMarginTop - targetMarginTop > 0.01) changeMargin();
      });
    };
    changeMargin();
  }

  handleTouchStart = e => {
    if (this.dom.scrollTop < 400 && !this.stopHandleTouch) {
      // 处于快要到顶端的时候，才处理 touchStart 事件
      this.pullDown.startScrollTop = this.dom.scrollTop;
      this.pullDown.startTouchPos = e.touches[0].pageY;
      if (!this.state.reachTop) this.setState({ reachTop: true });
    }
  };

  handleTouchMove = e => {
    if (!this.pullDown.startTouchPos) return;
    this.pullDown.lastTouchPos = e.touches[0].pageY;
    this.setIndicatorHeight(
      this.pullDown.lastTouchPos - this.pullDown.startTouchPos - this.pullDown.startScrollTop,
    );
  };

  handleTouchEnd = e => {
    if (!this.pullDown.startTouchPos) return;
    const { startTouchPos, lastTouchPos } = this.pullDown;
    if (startTouchPos && lastTouchPos - startTouchPos > this.indicatorInfo.height + 10) {
      this.setIndicatorHeightSmoothly(0);
      this.stopHandleTouch = true;
      let timeout = false;
      const closeLoading = () => {
        if (!timeout) this.setIndicatorHeightSmoothly(0 - this.indicatorInfo.height);
        this.stopHandleTouch = false;
      };
      this.props.onPullDown(closeLoading);
      setTimeout(() => {
        timeout = true;
        this.setIndicatorHeightSmoothly(0 - this.indicatorInfo.height);
        this.stopHandleTouch = false;
      }, 4000);

      // 平滑滚动到指定 loading 位置，并停止监听touch 逻辑，持续 1s；等待用户调用整体关闭逻辑（超时也会关闭）
    } else {
      // 虽然下拉了，但没到触发阈值，则直接归位
      this.setIndicatorHeightSmoothly(0 - this.indicatorInfo.height);
      this.blockTouchForAQWHile();
    }
    this.pullDown.startTouchPos = 0;
    this.pullDown.lastTouchPos = 0;
  };

  handleScroll = e => {
    if (this.stopHandleScroll) return;
    this.stopHandleScroll = true;
    setTimeout(() => {
      this.stopHandleScroll = false;
    }, 100);
    if (this.state.reachTop) {
      // 滚动出两屏，切换成绝对定位
      if (this.dom.scrollTop > 1600) this.setState({ reachTop: false });
    }
    if (!this.state.reachTop) {
      // 滚动入一屏，切换成普通定位
      if (this.dom.scrollTop < 800) this.setState({ reachTop: true });
    }
    this.isBottomReached();
    const { height = 800, itemSize, itemCount, headerSize = 0 } = this.props;
    const { windowSize, visibility } = this.state;
    // 智能生成，根据用户滑动速度，避免白屏，默认缓冲3屏
    const { scrollTop } = e.target;
    const baseLine = scrollTop + height / 2 - headerSize; // 如果是自动扩展的情况，目前偷懒简化为 800 了
    const baseIndex = Math.floor(baseLine / itemSize); // index 从 0 开始

    /**
     * 显示基线上方、下方 windowSize 个数的内容
     * 为了避免频繁渲染，可设置一个缓冲区，比如 windowSize 为 9 (主屏3，上面隐藏3，下面隐藏3)，那么上面4.5缓冲，下面4.5缓冲
     * 缓冲区已经无法满足需求，则重渲染
     */

    // 判断是否冲破缓冲区，需要重渲染
    const upperCheck = baseIndex - Math.ceil(windowSize / 2);
    const lowerCheck = baseIndex + Math.ceil(windowSize / 2);
    // if(upperCheck)
    let needRerender = false;
    if ((upperCheck > 0 && !visibility[upperCheck]) || (upperCheck <= 0 && !visibility[0])) {
      needRerender = true;
    }
    if (
      (lowerCheck < itemCount && !visibility[lowerCheck]) ||
      (lowerCheck >= itemCount && !visibility[itemCount - 1])
    )
      needRerender = true;
    if (needRerender) {
      const upperCache = baseIndex - windowSize;
      const lowerCache = baseIndex + windowSize;
      const visibilityArr = new Array(itemCount).fill(false);
      for (let i = 0; i < itemCount; i += 1) {
        if (i >= upperCache && i <= lowerCache) visibilityArr[i] = true;
      }
      this.setState({ visibility: visibilityArr });
    }
  };

  blockTouchForAQWHile() {
    this.stopHandleTouch = true;
    setTimeout(() => {
      this.stopHandleTouch = false;
    }, 300);
  }

  isBottomReached() {
    const { scrollTop, clientHeight, scrollHeight } = this.dom;
    if (scrollTop + clientHeight > scrollHeight - 1) {
      this.emitEvent();
    } else if (scrollTop + clientHeight > scrollHeight - 2400) {
      // 由于节流了，在边界时，需加入一些判断来保障
      setTimeout(() => {
        if (this.dom.scrollTop + this.dom.clientHeight > this.dom.scrollHeight - 1) {
          this.emitEvent();
        }
      }, 95);
    }
  }

  emitEvent() {
    if (this.stopCheckBottom) return;
    this.stopCheckBottom = true;
    this.props.onReachBottom();
    setTimeout(() => {
      this.stopCheckBottom = false;
    }, 1000);
  }

  render() {
    const {
      itemCount,
      itemSize,
      header,
      footer,
      height = '100%',
      width = '100%',
      headerSize = 0,
      children,
    } = this.props;
    const { visibility, styles, reachTop } = this.state;

    return (
      <div
        ref={dom => {
          this.dom = dom;
        }}
        style={{
          position: 'relative',
          height,
          width,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          ref={dom => {
            this.indicatorInfo.dom = dom;
          }}
        >
          {this.props.indicator}
        </div>
        {header && <div style={{ height: headerSize }}>{header}</div>}
        <div style={{ height: itemSize * itemCount }}>
          {visibility.map(
            (isShow, index) =>
              isShow && (
                // eslint-disable-next-line react/no-array-index-key
                <div key={index} style={reachTop ? { height: itemSize } : styles[index]}>
                  {children(index)}
                </div>
              ),
          )}
        </div>
        {footer}
      </div>
    );
  }
}
