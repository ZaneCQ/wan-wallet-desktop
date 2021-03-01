import React, { Component } from 'react';
import { message, Button, Form } from 'antd';
import { observer, inject } from 'mobx-react';
import intl from 'react-intl-universal';
import { TRANSTYPE } from 'utils/settings';
import NormalTransForm from 'components/NormalTransForm';
import TokenNormalTransForm from 'components/NormalTransForm/TokenNormalTransForm';
import { getNonce, getGasPrice, getBalanceByAddr } from 'utils/helper';

const CollectionCreateForm = Form.create({ name: 'NormalTransForm' })(NormalTransForm);
const TokenCollectionCreateForm = Form.create({ name: 'TokenNormalTransForm' })(TokenNormalTransForm);

@inject(stores => ({
  chainId: stores.session.chainId,
  addrInfo: stores.wanAddress.addrInfo,
  language: stores.languageIntl.language,
  tokensBalance: stores.tokens.tokensBalance,
  transParams: stores.sendTransParams.transParams,
  addTransTemplate: (addr, params) => stores.sendTransParams.addTransTemplate(addr, params),
  updateTransHistory: () => stores.wanAddress.updateTransHistory(),
  updateTransParams: (addr, paramsObj) => stores.sendTransParams.updateTransParams(addr, paramsObj),
  updateGasPrice: (...args) => stores.sendTransParams.updateGasPrice(...args),
}))

@observer
class SendNormalTrans extends Component {
  state = {
    spin: true,
    loading: false,
    visible: false,
  }

  componentWillUnmount() {
    this.setState = () => false;
  }

  showModal = async () => {
    const { from, addrInfo, path, chainType, chainId, addTransTemplate, updateTransParams, updateGasPrice, transType, tokenAddr, tokensBalance } = this.props;

    // No sufficient funds
    if (getBalanceByAddr(from, addrInfo) === '0') {
      message.warn(intl.get('SendNormalTrans.hasNoWANBalance'));
      return;
    }
    if (transType === TRANSTYPE.tokenTransfer) {
      if (!tokensBalance[tokenAddr] || tokensBalance[tokenAddr][from] === '0') {
        message.warn(intl.get('SendNormalTrans.hasNoTokenBalance'));
        return;
      }
    }
    this.setState({ visible: true });
    addTransTemplate(from, { chainType, chainId });
    try {
      let [nonce, gasPrice] = await Promise.all([getNonce(from, chainType), getGasPrice(chainType)]);
      updateTransParams(from, { path, nonce, gasPrice });
      updateGasPrice(gasPrice, chainType);
      setTimeout(() => { this.setState({ spin: false }) }, 0)
    } catch (err) {
      console.log(`Get nonce or gas price failed: ${err}`)
      message.warn(err);
    }
  }

  handleCancel = () => {
    this.setState({ visible: false, spin: true });
  }

  saveFormRef = formRef => {
    this.formRef = formRef;
  }

  handleSend = (from, splitAmount) => {
    this.setState({ loading: true });
    this.props.handleSend(from, splitAmount).then(ret => {
      this.setState({ visible: false, loading: false, spin: true });
    }).catch(err => {
      console.log(err);
      this.setState({ visible: false, loading: false, spin: true });
    });
  }

  render() {
    const { visible, loading, spin } = this.state;
    const { tokenAddr, transType, balance } = this.props;
    return (
      <div>
        <Button type="primary" className={this.props.buttonClassName ? this.props.buttonClassName : ''} onClick={this.showModal}>{intl.get('Common.send')}</Button>
        { visible && !tokenAddr && <CollectionCreateForm balance={balance} tokenAddr={tokenAddr} transType={transType} wrappedComponentRef={this.saveFormRef} onCancel={this.handleCancel} onSend={this.handleSend} loading={loading} spin={spin} disablePrivateTx={this.props.disablePrivateTx} />}
        { visible && tokenAddr && <TokenCollectionCreateForm balance={balance} transType={transType} wrappedComponentRef={this.saveFormRef} onCancel={this.handleCancel} onSend={this.handleSend} loading={loading} spin={spin} disablePrivateTx={this.props.disablePrivateTx} />}
      </div>
    );
  }
}

export default SendNormalTrans;
