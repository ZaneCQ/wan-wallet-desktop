import { Progress } from 'antd';
import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import intl from 'react-intl-universal';
import style from './index.less';

@inject(stores => ({
  language: stores.languageIntl.language,
}))

@observer
class Loading extends Component {
  state = {
    percent: 0
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      let currePercent = this.state.percent;
      let tmp = 5 + parseFloat(currePercent);
      if (tmp === 100) {
        tmp = 99.9
        clearInterval(this.timer);
      }
      this.setState({
        percent: tmp
      })
    }, 2000)
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    let { step } = this.props;
    return (
      <div className={style.loadingBg}>
        <div className={style.loadingCont}>
          <Progress className={style.progressSty} strokeColor={{ '0%': '#108ee9', '100%': '#87d068', }} percent={parseFloat(this.state.percent)} />
          <div className={style.tipContainer}>
            <p className={style.tip}>{intl.get('Loading.tips')}: {step ? intl.get(step) : ''}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default Loading;
