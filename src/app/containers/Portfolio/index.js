import React, { Component } from 'react';
import { Table } from 'antd';
import { observer, inject } from 'mobx-react';

import style from './index.less';
import wanLogo from 'static/image/wan.png';
import ethLogo from 'static/image/eth.png';
import btcLogo from 'static/image/btc.png';
import eosLogo from 'static/image/eos.png';

@inject(stores => ({
  portfolioList: stores.portfolio.portfolioList,
  tokenIconList: stores.tokens.tokenIconList,
  portfolioColumns: stores.languageIntl.portfolioColumns,
  setCoin: (coins) => stores.portfolio.setCoin(coins),
  updateCoinPrice: () => stores.portfolio.updateCoinPrice(),
  updateTokenBalance: () => stores.portfolio.updateTokenBalance(),
  changeTitle: newTitle => stores.languageIntl.changeTitle(newTitle),
  getTokenIcon: (tokenScAddr) => stores.tokens.getTokenIcon(tokenScAddr),
}))

@observer
class Portfolio extends Component {
  constructor(props) {
    super(props);
    this.props.changeTitle('Portfolio.portfolio');
  }

  componentWillMount() {
    const { portfolioColumns } = this.props;
    this.columns = [...portfolioColumns];
    this.columns[0]['render'] = this.TokenImgRender;
  }

  componentDidMount() {
    this.props.setCoin();
    this.props.updateCoinPrice();
    this.props.updateTokenBalance();
    this.timer = setInterval(() => {
      this.props.updateCoinPrice();
      this.props.updateTokenBalance();
    }, 60000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  TokenImgRender = (text, record) => {
    let img;
    switch (text) {
      case 'WAN':
        img = wanLogo;
        break;
      case 'ETH':
        img = ethLogo;
        break;
      case 'BTC':
        img = btcLogo;
        break;
      case 'EOS':
        img = eosLogo;
        break;
      default:
        let scAddr = record.scAddr.replace(/^.*-/, '');
        if (!this.props.tokenIconList[scAddr]) {
          this.props.getTokenIcon(scAddr);
        }
        img = this.props.tokenIconList[scAddr];
    }
    return <div><img className={style.nameIco} src={img} /><span>{text}</span></div>;
  }

  render() {
    const { portfolioList } = this.props;
    return (
      <div>
        <Table columns={this.columns} dataSource={portfolioList} pagination={false} />
      </div>
    );
  }
}

export default Portfolio;
