import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { BigNumber } from 'bignumber.js';
import { observer, inject } from 'mobx-react';
import { checkAmountUnit, getValueByAddrInfo, getNonce, getGasPrice, getChainId, getContractAddr, getContractData } from 'utils/helper';
import { Button, Modal, Form, Icon, message } from 'antd';
import { signTransaction } from 'componentUtils/trezor';
import { toWei } from 'utils/support.js';

import style from './index.less';
import PwdForm from 'componentUtils/PwdForm';
import CommonFormItem from 'componentUtils/CommonFormItem';
import AddrSelectForm from 'componentUtils/AddrSelectForm';
import ValidatorConfirmForm from 'components/Staking/ValidatorConfirmForm';
import { MINDAYS, WALLETID } from 'utils/settings'

const pu = require('promisefy-util');
const Confirm = Form.create({ name: 'ValidatorConfirmForm' })(ValidatorConfirmForm);

@inject(stores => ({
  settings: stores.session.settings,
  addrInfo: stores.wanAddress.addrInfo,
  addrSelectedList: stores.wanAddress.addrSelectedList,
  updateStakeInfo: () => stores.staking.updateStakeInfo(),
  updateTransHistory: () => stores.wanAddress.updateTransHistory(),
}))

@observer
class StoremanRegister extends Component {
  state = {
    balance: 0,
    confirmVisible: false,
    lockTime: MINDAYS,
    isAgency: true,
    initAmount: 50000,
    confirmLoading: false,
  };

  componentWillUnmount() {
    this.setState = (state, callback) => {
      return false;
    };
  }

  getValueByAddrInfoArgs = (...args) => {
    return getValueByAddrInfo(...args, this.props.addrInfo);
  }

  onChangePosAddrSelect = value => {
    this.setState(() => {
      let balance = value ? this.getValueByAddrInfoArgs(value, 'balance') : 0;
      return { balance }
    })
  }

  checkPublicKey = (rule, value, callback) => {
    if (value === undefined) {
      callback(intl.get('ValidatorRegister.publicKeyIsWrong'));
      return;
    }
    if (value.startsWith('0x') && value.length === 132) {
      callback();
    } else {
      callback(intl.get('ValidatorRegister.publicKeyIsWrong'));
    }
  }

  checkEnodeId = (rule, value, callback) => {
    if (value === undefined) {
      callback(intl.get('ValidatorRegister.publicKeyIsWrong'));
      return;
    }
    if (value.startsWith('0x') && value.length === 130) {
      callback();
    } else {
      callback(intl.get('ValidatorRegister.publicKeyIsWrong'));
    }
  }

  checkAmount = (rule, value, callback) => {
    let { form } = this.props;
    let balance = form.getFieldValue('balance');
    if (value === undefined || !checkAmountUnit(18, value)) {
      callback(intl.get('Common.invalidAmount'));
    }
    if (new BigNumber(value).minus(10000).lt(0)) {
      callback(intl.get('ValidatorRegister.stakeTooLow'));
      return;
    }
    if (new BigNumber(value).minus(balance).gte(0)) {
      callback(intl.get('SendNormalTrans.hasBalance'));
      return;
    }
    callback();
  }

  showConfirmForm = () => {
    let { form, settings } = this.props;
    form.validateFields(err => {
      if (err) return;
      if (new BigNumber(this.state.balance).minus(form.getFieldValue('amount')).lte(0)) {
        message.error(intl.get('NormalTransForm.overBalance'));
        return;
      }

      let pwd = form.getFieldValue('pwd');
      if (!settings.reinput_pwd) {
        this.setState({ confirmVisible: true });
      } else {
        wand.request('phrase_checkPwd', { pwd }, err => {
          if (err) {
            message.warn(intl.get('Backup.invalidPassword'));
          } else {
            this.setState({ confirmVisible: true });
          }
        })
      }
    })
  }

  onConfirmCancel = () => {
    this.setState({ confirmVisible: false, confirmLoading: false });
  }

  onSend = async () => {
    this.setState({
      confirmLoading: true
    });
    let { form } = this.props;
    let from = form.getFieldValue('myAddr');// In AddrSelectForm
    let amount = form.getFieldValue('amount');
    let path = this.getValueByAddrInfoArgs(from, 'path');
    let walletID = from.indexOf(':') !== -1 ? WALLETID[from.split(':')[0].toUpperCase()] : WALLETID.NATIVE;
    let maxFeeRate = form.getFieldValue('maxFeeRate') === undefined ? 100 : form.getFieldValue('maxFeeRate');
    let feeRate = form.getFieldValue('feeRate') === undefined ? 100 : form.getFieldValue('feeRate');
    from = from.indexOf(':') === -1 ? from : from.split(':')[1].trim();
    let tx = {
      from: from,
      amount: amount.toString(),
      BIP44Path: path,
      walletID: walletID,
      secPk: form.getFieldValue('publicKey1'),
      bn256Pk: form.getFieldValue('publicKey2'),
      lockEpoch: isNaN(global.slotCount * global.slotTime) ? form.getFieldValue('lockTime') : (form.getFieldValue('lockTime') * 24 * 3600) / (global.slotCount * global.slotTime),
      maxFeeRate: Math.round(maxFeeRate * 100),
      feeRate: Math.round(feeRate * 100),
    }
    if (walletID === WALLETID.LEDGER) {
      message.info(intl.get('Ledger.signTransactionInLedger'))
    }
    if (WALLETID.TREZOR === walletID) {
      await this.trezorRegisterValidator(path, from, (form.getFieldValue('amount') || 0).toString(), tx.secPk, tx.bn256Pk, tx.lockEpoch, tx.feeRate, tx.maxFeeRate);
      this.setState({ confirmVisible: false });
      this.props.onSend(walletID);
    } else {
      wand.request('staking_registerValidator', { tx }, (err, ret) => {
        if (err) {
          message.warn(intl.get('ValidatorRegister.registerFailed'));
        }
        this.setState({ confirmVisible: false, confirmLoading: false });
        this.props.onSend();
      });
    }
  }

  trezorRegisterValidator = async (path, from, value, secPk, bn256Pk, lockEpochs, feeRate, maxFeeRate) => {
    let chainId = await getChainId();
    let func = 'stakeRegister';// abi function
    try {
      let nonce = await getNonce(from, 'wan');
      let gasPrice = await getGasPrice('wan');
      let data = await getContractData(func, secPk, bn256Pk, lockEpochs, feeRate, maxFeeRate);

      let amountWei = toWei(value);
      const cscContractAddr = await getContractAddr();
      let rawTx = {};
      rawTx.from = from;
      rawTx.to = cscContractAddr;
      rawTx.value = amountWei;
      rawTx.data = data;
      rawTx.nonce = '0x' + nonce.toString(16);
      rawTx.gasLimit = '0x' + Number(200000).toString(16);
      rawTx.gasPrice = toWei(gasPrice, 'gwei');
      rawTx.Txtype = Number(1);
      rawTx.chainId = chainId;
      let raw = await pu.promisefy(signTransaction, [path, rawTx], this);// Trezor sign

      // Send register validator
      let txHash = await pu.promisefy(wand.request, ['transaction_raw', { raw, chainType: 'WAN' }], this);
      let params = {
        txHash,
        from: from.toLowerCase(),
        to: rawTx.to,
        value: rawTx.value,
        gasPrice: rawTx.gasPrice,
        gasLimit: rawTx.gasLimit,
        nonce: rawTx.nonce,
        srcSCAddrKey: 'WAN',
        srcChainType: 'WAN',
        tokenSymbol: 'WAN',
        status: 'Sent',
      };
      let satellite = {
        secPk,
        bn256Pk,
        lockTime: lockEpochs,
        annotate: 'StakeRegister'
      }
      // save register validator history into DB
      await pu.promisefy(wand.request, ['staking_insertRegisterValidatorToDB', { tx: params, satellite }], this);
      this.props.updateStakeInfo();
      this.props.updateTransHistory();
    } catch (error) {
      console.log(error);
      message.error(intl.get('ValidatorRegister.registerFailed'));
    }
  }

  render() {
    const { form, settings, addrSelectedList, onCancel, group } = this.props;
    console.log(group, 'bbb')
    const { getFieldDecorator } = form;
    let record = form.getFieldsValue(['publicKey1', 'publicKey2', 'lockTime', 'maxFeeRate', 'feeRate', 'myAddr', 'amount']);
    let showConfirmItem = { publicKey1: true, publicKey2: true, validatorAccount: true, lockTime: true, feeRate: this.state.isAgency, myAddr: true, amount: true, acceptDelegation: true };

    return (
      <div>
        <Modal visible closable={false} destroyOnClose={true} title="Storeman Registration" className="validator-register-modal"
          footer={[
            <Button key="back" className="cancel" onClick={onCancel}>{intl.get('Common.cancel')}</Button>,
            <Button key="submit" type="primary" onClick={this.showConfirmForm}>{intl.get('Common.next')}</Button>,
          ]}
        >
          <div className="validator-bg">
            <div className="stakein-title">Storeman Account</div>
            <CommonFormItem form={form} formName='publicKey'
              options={{ rules: [{ required: true, validator: this.checkPublicKey }] }}
              prefix={<Icon type="wallet" className="colorInput" />}
              title='Public Key'
              placeholder='Enter Public Key'
            />
            <CommonFormItem form={form} formName='enodeID'
              options={{ rules: [{ required: true, validator: this.checkEnodeId }] }}
              prefix={<Icon type="wallet" className="colorInput" />}
              title='Enode ID'
              placeholder='Enter Enode ID'
            />
            <CommonFormItem form={form} formName='groupId' disabled={true}
              options={{ initialValue: group.groupId }}
              prefix={<Icon type="credit-card" className="colorInput" />}
              title='Group ID'
            />
          </div>
          <div className="validator-bg">
            <div className="stakein-title">{intl.get('ValidatorRegister.myAccount')}</div>
            <div className="validator-line">
              <AddrSelectForm form={form} addrSelectedList={addrSelectedList} handleChange={this.onChangePosAddrSelect} getValueByAddrInfoArgs={this.getValueByAddrInfoArgs} />
            </div>
            <CommonFormItem form={form} formName='balance' disabled={true}
              options={{ initialValue: this.state.balance }}
              prefix={<Icon type="credit-card" className="colorInput" />}
              title={intl.get('ValidatorRegister.balance')}
            />
            <CommonFormItem form={form} formName='amount'
              options={{ initialValue: this.state.initAmount, rules: [{ required: true, validator: this.checkAmount }] }}
              prefix={<Icon type="credit-card" className="colorInput" />}
              title={intl.get('Common.amount')}
            />
            {settings.reinput_pwd && <PwdForm form={form} />}
          </div>
        </Modal>
        {this.state.confirmVisible && <Confirm confirmLoading={this.state.confirmLoading} showConfirmItem={showConfirmItem} onCancel={this.onConfirmCancel} onSend={this.onSend} record={Object.assign(record, { acceptDelegation: this.state.isAgency })} title={intl.get('NormalTransForm.ConfirmForm.transactionConfirm')} />}
      </div>
    );
  }
}

export default StoremanRegister;