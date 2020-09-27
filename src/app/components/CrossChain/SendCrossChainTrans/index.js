import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { BigNumber } from 'bignumber.js';
import { observer, inject } from 'mobx-react';
import { message, Button, Form } from 'antd';
import { getGasPrice, getBalanceByAddr, getStoremanGroupListByChainPair } from 'utils/helper';
import CrossChainTransForm from 'components/CrossChain/CrossChainTransForm';
import { INBOUND, LOCKETH_GAS, REDEEMWETH_GAS, LOCKWETH_GAS, REDEEMETH_GAS } from 'utils/settings';

const TransForm = Form.create({ name: 'CrossChainTransForm' })(CrossChainTransForm);

@inject(stores => {
  return {
    chainId: stores.session.chainId,
    language: stores.languageIntl.language,
    transParams: stores.sendCrossChainParams.transParams,
    tokenPairs: stores.crossChain.tokenPairs,
    currTokenPairId: stores.crossChain.currTokenPairId,
    updateTransParams: (addr, paramsObj) => stores.sendCrossChainParams.updateTransParams(addr, paramsObj),
    addCrossTransTemplate: (addr, params) => stores.sendCrossChainParams.addCrossTransTemplate(addr, params),
    getChainAddressInfoByChain: chain => stores.tokens.getChainAddressInfoByChain(chain),
  }
})

@observer
class Trans extends Component {
  state = {
    spin: true,
    loading: false,
    visible: false,
    smgList: [],
    estimateFee: {
      original: 0,
      destination: 0,
    },
    tokenAddr: '',
    chainType: '',
    gasPrice: 0,
  }

  showModal = async () => {
    const { from, path, balance, addCrossTransTemplate, updateTransParams, type, tokenPairs, currTokenPairId, getChainAddressInfoByChain } = this.props;
    if (!(currTokenPairId in tokenPairs)) {
      message.error('Token pair ID is missing.');
      return false;
    }
    let info = Object.assign({}, tokenPairs[currTokenPairId]);
    let chainType = type === INBOUND ? info.fromChainSymbol : info.toChainSymbol;
    let desChain, origGas, destGas, storeman;
    let tokenAddr = info.toAccount;
    this.setState({ chainType, tokenAddr });
    if (type === INBOUND) {
      if (Number(getBalanceByAddr(from, getChainAddressInfoByChain(info.fromChainSymbol))) === 0) {
      message.warn(intl.get('SendNormalTrans.hasBalance'));
        return;
      }
      if (balance === 0) {
        message.warn(intl.get('SendNormalTrans.hasNoTokenBalance'));
        return;
      }
      desChain = info.toChainSymbol;
      origGas = LOCKETH_GAS;// ToDo
      destGas = REDEEMWETH_GAS;// ToDo
    } else {
      if (Number(getBalanceByAddr(from, getChainAddressInfoByChain(info.toChainSymbol))) === 0) {
        message.warn(intl.get('SendNormalTrans.hasBalance'));
        return;
      }
      if (balance === 0) {
        message.warn(intl.get('SendNormalTrans.hasNoTokenBalance'));
        return;
      }
      desChain = info.fromChainSymbol;
      origGas = LOCKWETH_GAS;// ToDo
      destGas = REDEEMETH_GAS;// ToDo
    }

    this.setState({ visible: true, spin: true, loading: true });
    addCrossTransTemplate(from, { chainType, path });
    try {
      let [gasPrice, desGasPrice, smgList] = await Promise.all([getGasPrice(chainType), getGasPrice(desChain), getStoremanGroupListByChainPair(info.fromChainID, info.toChainID)]);
      console.log('smgList:', smgList)
      smgList = smgList.filter(obj => {
        let now = Date.now();
        return obj.status === '5' && (now > obj.startTime * 1000) && (now < obj.endTime * 1000);
      });
      if (smgList.length === 0) {
        this.setState(() => ({ visible: false, spin: false, loading: false }));
        message.warn(intl.get('SendNormalTrans.smgUnavailable'));
        return;
      }
      this.setState({
        smgList,
        estimateFee: {
          original: new BigNumber(gasPrice).times(origGas).div(BigNumber(10).pow(9)).toString(10),
          destination: new BigNumber(desGasPrice).times(destGas).div(BigNumber(10).pow(9)).toString(10)
        },
        gasPrice,
      });
      storeman = smgList[0].groupId;

      updateTransParams(from, {
        gasPrice,
        gasLimit: origGas,
        storeman,
        txFeeRatio: smgList[0].txFeeRatio || 0,
      });
      this.setState({ spin: false, loading: false });
    } catch (err) {
      console.log('showModal:', err)
      message.warn(intl.get('network.down'));
      this.setState(() => ({ visible: false, spin: false, loading: false }));
    }
  }

  handleCancel = () => {
    this.setState({ visible: false, spin: true });
  }

  saveFormRef = formRef => {
    this.formRef = formRef;
  }

  handleSend = from => {
    this.setState({ loading: true });
    this.props.handleSend(from).then(() => {
      this.setState({ visible: false, loading: false, spin: true });
    }).catch(() => {
      this.setState({ visible: false, loading: false, spin: true });
    });
  }

  render() {
    const { visible, loading, spin, smgList, estimateFee, tokenAddr, chainType, gasPrice } = this.state;
    const { balance, from, type, account } = this.props;
    return (
      <div>
        <Button type="primary" onClick={this.showModal} disabled={Number(balance) === 0}>{intl.get('Common.convert')}</Button>
        {visible &&
          <TransForm balance={balance} from={from} account={account} gasPrice={gasPrice} tokenAddr={tokenAddr} chainType={chainType} type={type} estimateFee={estimateFee} smgList={smgList} wrappedComponentRef={this.saveFormRef} onCancel={this.handleCancel} onSend={this.handleSend} loading={loading} spin={spin} />
        }
      </div>
    );
  }
}

export default Trans;