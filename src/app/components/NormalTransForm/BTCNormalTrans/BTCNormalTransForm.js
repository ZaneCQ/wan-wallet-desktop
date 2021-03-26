import bs58check from 'bs58check';
import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { BigNumber } from 'bignumber.js';
import { observer, inject } from 'mobx-react';
import { Button, Modal, Form, Input, Icon, message, Spin, Checkbox } from 'antd';

import style from '../index.less';
import { formatNumByDecimals } from 'utils/support';
import ConfirmForm from 'components/NormalTransForm/BTCNormalTrans/BTCConfirmForm';
import { checkAmountUnit, formatAmount, btcCoinSelect, btcCoinSelectSplit, getPathFromUtxos, checkAddressByChainType } from 'utils/helper';

const Confirm = Form.create({ name: 'NormalTransForm' })(ConfirmForm);

@inject(stores => ({
  utxos: stores.btcAddress.utxos,
  settings: stores.session.settings,
  btcPath: stores.btcAddress.btcPath,
  addrInfo: stores.btcAddress.addrInfo,
  language: stores.languageIntl.language,
  getAmount: stores.btcAddress.getAllAmount,
  transParams: stores.sendTransParams.BTCTransParams,
  updateTransParams: paramsObj => stores.sendTransParams.updateBTCTransParams(paramsObj),
}))

@observer
class BTCNormalTransForm extends Component {
  state = {
    fee: 0,
    confirmVisible: false,
    sendAll: false,
  }

  componentWillUnmount() {
    this.setState = (state, callback) => {
      return false;
    };
  }

  handleConfirmCancel = () => {
    this.setState({
      confirmVisible: false,
    });
  }

  onCancel = () => {
    this.setState({
      advanced: false
    });
    this.props.onCancel();
  }

  handleNext = () => {
    const { updateTransParams, settings } = this.props;
    let form = this.props.form;
    form.validateFields((err, { pwd, amount: sendAmount }) => {
      if (err) {
        console.log('handleNext', err);
        return;
      };

      if (settings.reinput_pwd) {
        if (!pwd) {
          message.warn(intl.get('Backup.invalidPassword'));
          return;
        }
        wand.request('phrase_checkPwd', { pwd }, err => {
          if (err) {
            message.warn(intl.get('Backup.invalidPassword'));
          } else {
            updateTransParams({ to: form.getFieldValue('to'), value: formatAmount(sendAmount) });
            this.setState({ advanced: false, confirmVisible: true });
          }
        })
      } else {
        updateTransParams({ to: form.getFieldValue('to'), value: formatAmount(sendAmount) });
        this.setState({ advanced: false, confirmVisible: true });
      }
    });
  }

  checkBTCAddress = async (rule, value, callback) => {
    let isValid = await checkAddressByChainType(value, 'BTC');
    if (isValid) {
      if (this.isNotNativeAddress(value)) {
        if (this.state.sendAll) {
          this.props.form.validateFields(['amount']);
        }
        callback();
      } else {
        callback(intl.get('NormalTransForm.isNativeBtcAddress'));
      }
    } else {
      callback(intl.get('NormalTransForm.invalidAddress'));
    }
  }

  isNotNativeAddress = (value) => {
    const { normal, rawKey } = this.props.addrInfo;
    if (Object.keys(normal).filter(item => new BigNumber(normal[item].balance).gte('0')).concat(Object.keys(rawKey).filter(item => new BigNumber(rawKey[item].balance).gte('0'))).includes(value)) {
      return false;
    } else {
      return true;
    }
  }

  checkAmount = (rule, value, callback) => {
    if (new BigNumber(value).gt(0) && checkAmountUnit(8, value)) {
      const { utxos, addrInfo, btcPath, updateTransParams, transParams: { feeRate }, form } = this.props;
      if (this.state.sendAll) {
        let to = form.getFieldValue('to');
        btcCoinSelectSplit(utxos, to, feeRate).then(data => {
          updateTransParams({ from: getPathFromUtxos(data.inputs, addrInfo, btcPath) });
          this.setState({
            fee: formatNumByDecimals(data.fee, 8)
          });
          callback();
        }).catch((e) => {
          console.log('error:', e);
          callback(intl.get('NormalTransForm.overBalance'));
        });
      } else {
        btcCoinSelect(utxos, value, feeRate).then(data => {
          updateTransParams({ from: getPathFromUtxos(data.inputs, addrInfo, btcPath) });
          this.setState({
            fee: formatNumByDecimals(data.fee, 8)
          })
          callback();
        }).catch((e) => {
          console.log('error:', e);
          callback(intl.get('NormalTransForm.overBalance'));
        });
      }
    } else {
      callback(intl.get('Common.invalidAmount'));
    }
  }

  sendAllAmount = e => {
    let { form, getAmount } = this.props;
    if (e.target.checked) {
      let isValidTo;
      this.props.form.validateFields(['to'], (errors) => {
        isValidTo = !errors;
      });
      if (!isValidTo) { // Can not send all when the to address is invalid.
        message.warn(intl.get('NormalTransForm.inputToAddress'));
        return false
      };
      this.setState({ sendAll: true }, () => {
        form.setFieldsValue({
          amount: getAmount
        }, () => {
          form.validateFields(['amount']);
        });
      });
    } else {
      this.setState({ sendAll: false }, () => {
        form.setFieldsValue({
          amount: 0
        }, () => {
          form.validateFields(['amount']);
        });
      });
    }
  }

  render() {
    const { loading, form, settings, getAmount } = this.props;
    const { confirmVisible } = this.state;
    const { getFieldDecorator } = form;

    return (
      <div>
        <Modal
          visible
          wrapClassName={style.ETHNormalTransFormModal}
          destroyOnClose={true}
          closable={false}
          title={intl.get('NormalTransForm.transaction')}
          onCancel={this.onCancel}
          footer={[
            <Button key="back" className="cancel" onClick={this.onCancel}>{intl.get('Common.cancel')}</Button>,
            <Button disabled={this.props.spin} key="submit" type="primary" onClick={this.handleNext}>{intl.get('Common.next')}</Button>,
          ]}
        >
          <Spin spinning={this.props.spin} size="large" /* tip={intl.get('Loading.transData')} indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />} */ className="loadingData">
            <Form labelCol={{ span: 24 }} wrapperCol={{ span: 24 }} className={style.transForm}>
              <Form.Item label={intl.get('StakeInForm.balance')}>
                {getFieldDecorator('balance', { initialValue: getAmount })
                  (<Input disabled={true} placeholder={intl.get('NormalTransForm.recipientAddress')} prefix={<Icon type="wallet" className="colorInput" />} />)}
              </Form.Item>
              <Form.Item label={intl.get('NormalTransForm.to')}>
                {getFieldDecorator('to', { rules: [{ required: true, validator: this.checkBTCAddress }] })
                  (<Input placeholder={intl.get('NormalTransForm.recipientAddress')} prefix={<Icon type="wallet" className="colorInput" />} />)}
              </Form.Item>
              <Form.Item label={intl.get('Common.amount')}>
                {getFieldDecorator('amount', { rules: [{ required: true, validator: this.checkAmount }] })
                  (<Input min={0} placeholder='0' prefix={<Icon type="credit-card" className="colorInput" />} />)}
                <Checkbox checked={this.state.sendAll} onChange={this.sendAllAmount}>{intl.get('NormalTransForm.sendAll')}</Checkbox>
              </Form.Item>
              <Form.Item label={intl.get('NormalTransForm.fee')}>
                {getFieldDecorator('fee', { initialValue: this.state.fee })
                  (<Input disabled={true} prefix={<Icon type="wallet" className="colorInput" />} />)}
              </Form.Item>
              {
                settings.reinput_pwd &&
                <Form.Item label={intl.get('NormalTransForm.password')}>
                  {getFieldDecorator('pwd', { rules: [{ required: true, message: intl.get('NormalTransForm.pwdIsIncorrect') }] })
                    (<Input.Password placeholder={intl.get('Backup.enterPassword')} prefix={<Icon type="lock" className="colorInput" />} />)}
                </Form.Item>
              }
            </Form>
          </Spin>
        </Modal>
        <Confirm visible={confirmVisible} onCancel={this.handleConfirmCancel} fee={this.state.fee} sendTrans={this.props.onSend} loading={loading} />
      </div>
    );
  }
}

export default BTCNormalTransForm;
