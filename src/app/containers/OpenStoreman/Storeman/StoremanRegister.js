import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { BigNumber } from 'bignumber.js';
import { observer, inject } from 'mobx-react';
import { Button, Modal, Form, Icon, message, Spin } from 'antd';

import './index.less';
import { WALLETID } from 'utils/settings';
import PwdForm from 'componentUtils/PwdForm';
import { OsmTrezorTrans } from 'componentUtils/trezor';
import StoremanConfirmForm from './StoremanConfirmForm';
import { fromWei, wandWrapper } from 'utils/support.js';
import CommonFormItem from 'componentUtils/CommonFormItem';
import AddrSelectForm from 'componentUtils/AddrSelectForm';
import { checkAmountUnit, getValueByAddrInfo } from 'utils/helper';

const ACTION = 'stakeIn';
const Confirm = Form.create({ name: 'StoremanConfirmForm' })(StoremanConfirmForm);

@inject(stores => ({
  settings: stores.session.settings,
  addrInfo: stores.wanAddress.addrInfo,
  addrSelectedList: stores.wanAddress.addrSelectedList,
  storemanListInfo: stores.openstoreman.storemanListInfo,
  updateTransHistory: () => stores.wanAddress.updateTransHistory(),
}))

@observer
class StoremanRegister extends Component {
  state = {
    fee: '0',
    balance: '0',
    gasPrice: '0',
    gasLimit: '0',
    spin: false,
    confirmVisible: false,
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

  onChangeAddrSelect = value => {
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
    if (String(value).startsWith('0x') && value.length === 130) {
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
    if (String(value).startsWith('0x') && value.length === 130) {
      callback();
    } else {
      callback(intl.get('ValidatorRegister.publicKeyIsWrong'));
    }
  }

  checkAmount = (rule, value, callback) => {
    let { form, group } = this.props;
    let balance = form.getFieldValue('balance');
    if (value === undefined || !checkAmountUnit(18, value)) {
      callback(intl.get('Common.invalidAmount'));
    }
    if (new BigNumber(value).lt(group.minStakeIn)) {
      callback(intl.get('ValidatorRegister.stakeTooLow'));
      return;
    }
    if (new BigNumber(value).gte(balance)) {
      callback(intl.get('SendNormalTrans.hasBalance'));
      return;
    }

    let { myAddr: from, publicKey: wPk, enodeID } = form.getFieldsValue(['myAddr', 'publicKey', 'enodeID']);
    if (from && wPk && enodeID && value !== '0') {
      let BIP44Path = this.getValueByAddrInfoArgs(from, 'path');
      let walletID = from.indexOf(':') !== -1 ? WALLETID[from.split(':')[0].toUpperCase()] : WALLETID.NATIVE;
      let tx = {
        wPk,
        enodeID,
        walletID,
        BIP44Path,
        amount: value,
        groupId: group.groupId,
        from: from.indexOf(':') === -1 ? from : from.split(':')[1].trim(),
      }
      wand.request('storeman_openStoremanAction', { tx, action: ACTION, isEstimateFee: false }, (err, ret) => {
        if (err) {
          console.error('storeman_openStoremanAction', err.desc)
          message.warn(intl.get('ValidatorRegister.registerFailed'));
        } else {
          let data = ret.result;
          this.setState({
            gasPrice: data.gasPrice,
            gasLimit: new BigNumber(data.estimateGas).multipliedBy(1.6).toString(10),
            fee: fromWei(new BigNumber(data.gasPrice).multipliedBy(data.estimateGas).toString(10))
          })
        }
      });
    }
    callback();
  }

  showConfirmForm = () => {
    let { form, settings } = this.props;
    form.validateFields(async err => {
      if (err) return;
      if (new BigNumber(form.getFieldValue('balance')).minus(form.getFieldValue('amount')).lt(this.state.fee)) {
        message.warn(intl.get('NormalTransForm.overBalance'));
        return;
      }

      let { publicKey: wPk } = form.getFieldsValue(['publicKey']);
      try {
        this.setState({ spin: true })
        let wkAddr = await wandWrapper('storeman_publicToAddress', { wPk });
        let storemanInfo = await wandWrapper('storeman_getStoremanStakeInfo', { wkAddr });
        if (storemanInfo.length !== 0 && (storemanInfo[0].deposit !== '0' || storemanInfo[0].partnerCount !== '0' || storemanInfo[0].delegatorCount !== '0')) {
          this.setState({ spin: false })
          message.warn(intl.get('Storeman.repeatedPK'));
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
      } catch (err) {
        this.setState({ spin: false })
        message.warn(intl.get('network.down'));
        console.error('StoremanRegister_showConfirmForm', err.message)
      }
    })
  }

  onConfirmCancel = () => {
    this.setState({ confirmVisible: false, confirmLoading: false, spin: false });
  }

  onSend = async () => {
    this.setState({ confirmLoading: true });
    let { form, group } = this.props;
    let { myAddr: from, amount, publicKey: wPk, enodeID } = form.getFieldsValue(['myAddr', 'amount', 'publicKey', 'enodeID']);
    let BIP44Path = this.getValueByAddrInfoArgs(from, 'path');
    let walletID = from.indexOf(':') !== -1 ? WALLETID[from.split(':')[0].toUpperCase()] : WALLETID.NATIVE;

    from = from.indexOf(':') === -1 ? from : from.split(':')[1].trim();
    let tx = {
      wPk,
      from,
      amount,
      walletID,
      BIP44Path,
      enodeID,
      groupId: group.groupId,
      gasLimit: this.state.gasLimit,
    }
    if (walletID === WALLETID.LEDGER) {
      message.info(intl.get('Ledger.signTransactionInLedger'))
    }
    if (walletID === WALLETID.TREZOR) {
      try {
        let wkAddr = await wandWrapper('storeman_publicToAddress', { wPk });
        let satellite = { wkAddr, wPk, enodeID: group.enodeID, groupId: group.groupId, delegateFee: group.delegateFee, annotate: 'Storeman-stakeIn' };
        let { gasLimit, ...txParams } = tx
        await OsmTrezorTrans(txParams, from, ACTION, satellite);
        this.props.onSend(walletID);
      } catch (err) {
        console.error('StoremanRegister: ', err.message)
        message.warn(intl.get('WanAccount.sendTransactionFailed'));
      }
      this.setState({ confirmVisible: false, confirmLoading: false, spin: false });
    } else {
      wand.request('storeman_openStoremanAction', { tx, action: ACTION }, (err, ret) => {
        if (err) {
          console.error('storeman_openStoremanAction: ', err.desc)
          message.warn(intl.get('WanAccount.sendTransactionFailed'));
        } else {
          message.success(intl.get('WanAccount.sendTransactionSuccessFully'));
        }
        this.props.updateTransHistory();
        this.setState({ confirmVisible: false, confirmLoading: false, spin: false });
        this.props.onSend();
      });
    }
  }

  render() {
    const { form, settings, addrSelectedList, onCancel, group, storemanListInfo } = this.props;
    let record = form.getFieldsValue(['publicKey', 'enodeID', 'myAddr', 'amount', 'crosschain']);
    let showConfirmItem = { groupId: true, publicKey: true, enodeID: true, crosschain: true, account: true, amount: true };
    let addrSelectedListFilter = addrSelectedList // .filter(v => !storemanListInfo.map(i => i.from.toLowerCase()).includes(v.toLowerCase()))

    return (
      <div>
        <Modal visible closable={false} destroyOnClose={true} title={intl.get('Storeman.registration')} className="validator-register-modal + spincont"
          footer={[
            <Button key="back" className="cancel" onClick={onCancel}>{intl.get('Common.cancel')}</Button>,
            <Button disabled={this.state.spin} key="submit" type="primary" onClick={this.showConfirmForm}>{intl.get('Common.next')}</Button>,
          ]}
        >
          <Spin spinning={this.state.spin} size="large">
            <div className="validator-bg">
              <div className="stakein-title">{intl.get('Storeman.storemanAccount')}</div>
              <CommonFormItem form={form} formName='groupId' disabled={true}
                options={{ initialValue: group.groupIdName }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('Storeman.group')}
              />
              <CommonFormItem form={form} formName='crosschain' disabled={true}
                options={{ initialValue: group.crosschain }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('Common.crossChain')}
              />
              <CommonFormItem form={form} formName='publicKey'
                options={{ rules: [{ required: true, validator: this.checkPublicKey }] }}
                prefix={<Icon type="wallet" className="colorInput" />}
                title={intl.get('WanAccount.publicKey')}
                placeholder={intl.get('Storeman.enterPublicKey')}
              />
              <CommonFormItem form={form} formName='enodeID'
                options={{ rules: [{ required: true, validator: this.checkEnodeId }] }}
                prefix={<Icon type="wallet" className="colorInput" />}
                title='Enode ID'
                placeholder={intl.get('Storeman.enterEnodeID')}
              />
            </div>
            <div className="validator-bg">
              <div className="stakein-title">{intl.get('ValidatorRegister.myAccount')}</div>
              <div className="validator-line">
                <AddrSelectForm form={form} addrSelectedList={addrSelectedListFilter} handleChange={this.onChangeAddrSelect} getValueByAddrInfoArgs={this.getValueByAddrInfoArgs} />
              </div>
              <CommonFormItem form={form} formName='balance' disabled={true}
                options={{ initialValue: this.state.balance }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('ValidatorRegister.balance')}
              />
              <CommonFormItem form={form} formName='amount'
                options={{ rules: [{ required: true, validator: this.checkAmount }] }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('Common.amount')}
                placeholder={this.props.group.minStakeIn}
              />
              <CommonFormItem form={form} formName='fee' disabled={true}
                options={{ initialValue: this.state.fee + ' WAN' }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('CrossChainTransForm.estimateFee')}
              />
              {settings.reinput_pwd && <PwdForm form={form} />}
            </div>
          </Spin>
        </Modal>
        {this.state.confirmVisible && <Confirm confirmLoading={this.state.confirmLoading} showConfirmItem={showConfirmItem} onCancel={this.onConfirmCancel} onSend={this.onSend} record={Object.assign(record, { groupIdName: group.groupIdName, account: record.myAddr })} title={intl.get('NormalTransForm.ConfirmForm.transactionConfirm')} />}
      </div>
    );
  }
}

export default StoremanRegister;
